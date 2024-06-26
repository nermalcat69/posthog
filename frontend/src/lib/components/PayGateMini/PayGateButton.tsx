import { LemonButton } from '@posthog/lemon-ui'

import { BillingProductV2AddonType, BillingProductV2Type, BillingV2FeatureType, BillingV2Type } from '~/types'

interface PayGateButtonProps {
    gateVariant: 'add-card' | 'contact-sales' | 'move-to-cloud' | null
    productWithFeature: BillingProductV2AddonType | BillingProductV2Type
    featureInfo: BillingV2FeatureType
    onCtaClick: () => void
    billing: BillingV2Type | null
    scrollToProduct: boolean
}

export const PayGateButton = ({
    gateVariant,
    productWithFeature,
    featureInfo,
    onCtaClick,
    billing,
    scrollToProduct = true,
}: PayGateButtonProps): JSX.Element => {
    return (
        <LemonButton
            to={getCtaLink(gateVariant, productWithFeature, featureInfo, scrollToProduct)}
            type="primary"
            center
            onClick={onCtaClick}
        >
            {getCtaLabel(gateVariant, billing)}
        </LemonButton>
    )
}

const getCtaLink = (
    gateVariant: 'add-card' | 'contact-sales' | 'move-to-cloud' | null,
    productWithFeature: BillingProductV2AddonType | BillingProductV2Type,
    featureInfo: BillingV2FeatureType,
    scrollToProduct: boolean = true
): string | undefined => {
    if (gateVariant === 'add-card') {
        return `/organization/billing${scrollToProduct ? `?products=${productWithFeature.type}` : ''}`
    } else if (gateVariant === 'contact-sales') {
        return `mailto:sales@posthog.com?subject=Inquiring about ${featureInfo.name}`
    } else if (gateVariant === 'move-to-cloud') {
        return 'https://us.posthog.com/signup?utm_medium=in-product&utm_campaign=move-to-cloud'
    }
    return undefined
}

const getCtaLabel = (
    gateVariant: 'add-card' | 'contact-sales' | 'move-to-cloud' | null,
    billing: BillingV2Type | null
): string => {
    if (gateVariant === 'add-card') {
        return billing?.has_active_subscription ? 'Upgrade now' : 'Subscribe now'
    } else if (gateVariant === 'contact-sales') {
        return 'Contact sales'
    }
    return 'Move to PostHog Cloud'
}
