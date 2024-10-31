package main

import (
	"encoding/json"
	"log"
	"time"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
	"github.com/getsentry/sentry-go"
)

type PostHogEventWrapper struct {
	Uuid       string `json:"uuid"`
	DistinctId string `json:"distinct_id"`
	Ip         string `json:"ip"`
	Data       string `json:"data"`
	Token      string `json:"token"`
}

type PostHogEvent struct {
	Token      string                 `json:"api_key,omitempty"`
	Event      string                 `json:"event"`
	Properties map[string]interface{} `json:"properties"`
	Timestamp  string                 `json:"timestamp,omitempty"`

	Uuid       string
	DistinctId string
	Lat        float64
	Lng        float64
}

type KafkaConsumerInterface interface {
	SubscribeTopics(topics []string, rebalanceCb kafka.RebalanceCb) error
	ReadMessage(timeout time.Duration) (*kafka.Message, error)
	Close() error
}

type KafkaConsumer interface {
	Consume()
	Close()
}

type PostHogKafkaConsumer struct {
	consumer        KafkaConsumerInterface
	topic           string
	geolocator      GeoLocator
	outgoingChan    chan PostHogEvent
	statsChan       chan PostHogEvent
	tokenFinderChan chan map[string]interface{}
}

func NewPostHogKafkaConsumer(
	brokers string,
	securityProtocol string,
	groupID string,
	topic string,
	geolocator GeoLocator,
	outgoingChan chan PostHogEvent,
	statsChan chan PostHogEvent,
	tokenFinderChan chan map[string]interface{},
) (*PostHogKafkaConsumer, error) {
	config := &kafka.ConfigMap{
		"bootstrap.servers":  brokers,
		"group.id":           groupID,
		"auto.offset.reset":  "latest",
		"enable.auto.commit": false,
		"security.protocol":  securityProtocol,
	}

	consumer, err := kafka.NewConsumer(config)
	if err != nil {
		return nil, err
	}

	return &PostHogKafkaConsumer{
		consumer:        consumer,
		topic:           topic,
		geolocator:      geolocator,
		outgoingChan:    outgoingChan,
		statsChan:       statsChan,
		tokenFinderChan: tokenFinderChan,
	}, nil
}

func (c *PostHogKafkaConsumer) Consume() {
	err := c.consumer.SubscribeTopics([]string{c.topic}, nil)
	if err != nil {
		sentry.CaptureException(err)
		log.Fatalf("Failed to subscribe to topic: %v", err)
	}

	for {
		msg, err := c.consumer.ReadMessage(-1)
		if err != nil {
			log.Printf("Error consuming message: %v", err)
			sentry.CaptureException(err)
		}

		// This is used to find all of the 'token' keys in the json payload
		var rawJSON map[string]interface{}
		err = json.Unmarshal(msg.Value, &rawJSON)
		if err != nil {
			log.Printf("Error decoding raw JSON: %v", err)
			log.Printf("Data: %s", string(msg.Value))
		}
		c.tokenFinderChan <- rawJSON

		var wrapperMessage PostHogEventWrapper
		err = json.Unmarshal(msg.Value, &wrapperMessage)
		if err != nil {
			log.Printf("Error decoding JSON: %v", err)
			log.Printf("Data: %s", string(msg.Value))
		}

		phEvent := PostHogEvent{
			Timestamp:  time.Now().UTC().Format("2006-01-02T15:04:05.000Z"),
			Token:      "",
			Event:      "",
			Properties: make(map[string]interface{}),
		}

		data := []byte(wrapperMessage.Data)

		err = json.Unmarshal(data, &phEvent)
		if err != nil {
			log.Printf("Error decoding JSON: %v", err)
			log.Printf("Data: %s", string(data))
		}

		phEvent.Uuid = wrapperMessage.Uuid
		phEvent.DistinctId = wrapperMessage.DistinctId

		if wrapperMessage.Token != "" {
			phEvent.Token = wrapperMessage.Token
		} else if phEvent.Token == "" {
			if tokenValue, ok := phEvent.Properties["token"].(string); ok {
				phEvent.Token = tokenValue
			} else {
				log.Printf("No valid token found in event %s", string(msg.Value))
			}
		}

		var ipStr string = ""
		if ipValue, ok := phEvent.Properties["$ip"]; ok {
			if ipProp, ok := ipValue.(string); ok {
				if ipProp != "" {
					ipStr = ipProp
				}
			}
		} else {
			if wrapperMessage.Ip != "" {
				ipStr = wrapperMessage.Ip
			}
		}

		if ipStr != "" {
			phEvent.Lat, phEvent.Lng, err = c.geolocator.Lookup(ipStr)
			if err != nil && err.Error() != "invalid IP address" { // An invalid IP address is not an error on our side
				sentry.CaptureException(err)
			}
		}

		c.outgoingChan <- phEvent
		c.statsChan <- phEvent
	}
}

func (c *PostHogKafkaConsumer) Close() {
	c.consumer.Close()
}
