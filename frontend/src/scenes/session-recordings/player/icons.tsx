// Base icons from https://github.com/ant-design/ant-design

import React from 'react'

function BaseIcon({
    children,
    onClick = () => {},
    className = '',
}: {
    children: JSX.Element
    onClick?: () => void
    className?: string
}): JSX.Element {
    return (
        <span onClick={onClick} className={className || 'ph-rrweb-controller-icon'}>
            {children}
        </span>
    )
}

export function IconSeekBack({ onClick, className = '' }: { onClick: () => void; className?: string }): JSX.Element {
    // TODO: Allow the number of seconds to be set dynamically
    return (
        <BaseIcon onClick={onClick} className={className}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M26.6812 6.91244H11.2101V4.28466C11.2101 4.04674 10.9312 3.91535 10.7428 4.06094L5.59783 8.03812C5.56318 8.0647 5.53516 8.09865 5.5159 8.13741C5.49663 8.17617 5.48661 8.21872 5.48661 8.26184C5.48661 8.30496 5.49663 8.34751 5.5159 8.38627C5.53516 8.42503 5.56318 8.45898 5.59783 8.48556L10.7428 12.4627C10.9312 12.6083 11.2101 12.4769 11.2101 12.239V9.61124H26.2464V26.3012H4.28986C4.13043 26.3012 4 26.429 4 26.5853V28.7159C4 28.8722 4.13043 29 4.28986 29H26.6812C27.9601 29 29 27.9808 29 26.7273V9.18511C29 7.93159 27.9601 6.91244 26.6812 6.91244Z"
                    fill="currentColor"
                />
                <path
                    d="M17.0234 20.082C17.0234 20.5697 17.1488 20.9479 17.3994 21.2168C17.6546 21.4857 18.0055 21.6201 18.4521 21.6201C18.8988 21.6201 19.2474 21.4857 19.498 21.2168C19.7533 20.9479 19.8809 20.5697 19.8809 20.082C19.8809 19.5762 19.751 19.1934 19.4912 18.9336C19.236 18.6693 18.8896 18.5371 18.4521 18.5371C18.0146 18.5371 17.666 18.6693 17.4062 18.9336C17.151 19.1934 17.0234 19.5762 17.0234 20.082ZM15 20.2119C15 19.6559 15.1253 19.1523 15.376 18.7012C15.6312 18.25 16.0026 17.9105 16.4902 17.6826C16.0117 17.3636 15.6995 17.0195 15.5537 16.6504C15.4124 16.2767 15.3418 15.9281 15.3418 15.6045C15.3418 14.8844 15.613 14.2715 16.1553 13.7656C16.6976 13.2552 17.4632 13 18.4521 13C19.4411 13 20.2067 13.2552 20.749 13.7656C21.2913 14.2715 21.5625 14.8844 21.5625 15.6045C21.5625 15.9281 21.4896 16.2767 21.3438 16.6504C21.2025 17.0195 20.8926 17.3408 20.4141 17.6143C20.9017 17.8877 21.2686 18.25 21.5146 18.7012C21.7607 19.1523 21.8838 19.6559 21.8838 20.2119C21.8838 21.0459 21.5739 21.7568 20.9541 22.3447C20.3389 22.9281 19.4775 23.2197 18.3701 23.2197C17.2627 23.2197 16.4242 22.9281 15.8545 22.3447C15.2848 21.7568 15 21.0459 15 20.2119ZM17.2012 15.8232C17.2012 16.1833 17.3105 16.4772 17.5293 16.7051C17.7526 16.9329 18.0602 17.0469 18.4521 17.0469C18.8486 17.0469 19.154 16.9329 19.3682 16.7051C19.5869 16.4772 19.6963 16.1833 19.6963 15.8232C19.6963 15.4313 19.5869 15.126 19.3682 14.9072C19.154 14.6839 18.8486 14.5723 18.4521 14.5723C18.0602 14.5723 17.7526 14.6839 17.5293 14.9072C17.3105 15.126 17.2012 15.4313 17.2012 15.8232Z"
                    fill="currentColor"
                />
            </svg>
        </BaseIcon>
    )
}

export function IconPlay({ onClick, className = '' }: { onClick?: () => void; className?: string }): JSX.Element {
    return (
        <BaseIcon onClick={onClick} className={className}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M9.36139 28.8202L24.1954 17.1629C24.2945 17.0841 24.3746 16.984 24.4297 16.87C24.4847 16.756 24.5133 16.6311 24.5133 16.5045C24.5133 16.3779 24.4847 16.2529 24.4297 16.1389C24.3746 16.0249 24.2945 15.9248 24.1954 15.8461L9.36139 4.18126C8.81088 3.74978 8 4.13663 8 4.83592V28.1581C8 28.8574 8.81088 29.2517 9.36139 28.8202Z"
                    fill="currentColor"
                />
            </svg>
        </BaseIcon>
    )
}

export function IconPause({ onClick, className = '' }: { onClick?: () => void; className?: string }): JSX.Element {
    return (
        <BaseIcon onClick={onClick} className={className}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M9.5 5.5H12V26.5H9.5V5.5ZM22.25 5.5H20.25C20.1125 5.5 20 5.6125 20 5.75V26.25C20 26.3875 20.1125 26.5 20.25 26.5H22.25C22.3875 26.5 22.5 26.3875 22.5 26.25V5.75C22.5 5.6125 22.3875 5.5 22.25 5.5Z"
                    fill="currentColor"
                />
            </svg>
        </BaseIcon>
    )
}

export function IconFullscreen({ onClick, className = '' }: { onClick: () => void; className?: string }): JSX.Element {
    return (
        <BaseIcon onClick={onClick} className={className}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M9.06247 7.38754L10.4343 6.01567C10.4674 5.98246 10.4905 5.94064 10.5009 5.89498C10.5114 5.84931 10.5088 5.80163 10.4935 5.75735C10.4782 5.71307 10.4508 5.67397 10.4143 5.64451C10.3779 5.61504 10.334 5.59639 10.2875 5.59067L5.28122 5.00004C5.12184 4.98129 4.98434 5.11567 5.00309 5.27817L5.59372 10.2844C5.61872 10.4907 5.87184 10.5782 6.01872 10.4313L7.38434 9.06567L11.5625 13.2407C11.6593 13.3375 11.8187 13.3375 11.9156 13.2407L13.2406 11.9188C13.3375 11.8219 13.3375 11.6625 13.2406 11.5657L9.06247 7.38754ZM20.0843 13.2407C20.1812 13.3375 20.3406 13.3375 20.4375 13.2407L24.6156 9.06567L25.9812 10.4313C26.0144 10.4643 26.0562 10.4874 26.1019 10.4979C26.1476 10.5083 26.1953 10.5057 26.2395 10.4904C26.2838 10.4751 26.3229 10.4477 26.3524 10.4113C26.3818 10.3749 26.4005 10.3309 26.4062 10.2844L26.9968 5.28129C27.0156 5.12192 26.8812 4.98442 26.7187 5.00317L21.7125 5.59379C21.5062 5.61879 21.4187 5.87192 21.5656 6.01879L22.9375 7.39067L18.7593 11.5625C18.7128 11.6095 18.6867 11.673 18.6867 11.7391C18.6867 11.8052 18.7128 11.8687 18.7593 11.9157L20.0843 13.2407V13.2407ZM26.4062 21.7157C26.3812 21.5094 26.1281 21.4219 25.9812 21.5688L24.6156 22.9344L20.4375 18.7594C20.3905 18.7129 20.327 18.6868 20.2609 18.6868C20.1948 18.6868 20.1313 18.7129 20.0843 18.7594L18.7593 20.0813C18.7128 20.1283 18.6867 20.1917 18.6867 20.2579C18.6867 20.324 18.7128 20.3874 18.7593 20.4344L22.9375 24.6125L21.5656 25.9844C21.5325 26.0176 21.5095 26.0594 21.499 26.1051C21.4886 26.1508 21.4911 26.1985 21.5064 26.2427C21.5217 26.287 21.5492 26.3261 21.5856 26.3556C21.622 26.385 21.666 26.4037 21.7125 26.4094L26.7187 27C26.8781 27.0188 27.0156 26.8844 26.9968 26.7219L26.4062 21.7157ZM11.9156 18.7594C11.8686 18.7129 11.8052 18.6868 11.739 18.6868C11.6729 18.6868 11.6095 18.7129 11.5625 18.7594L7.38434 22.9344L6.01872 21.5688C5.98551 21.5357 5.9437 21.5127 5.89803 21.5022C5.85236 21.4918 5.80468 21.4943 5.7604 21.5096C5.71612 21.5249 5.67702 21.5524 5.64756 21.5888C5.61809 21.6252 5.59944 21.6692 5.59372 21.7157L5.00309 26.7188C4.98434 26.8782 5.11872 27.0157 5.28122 26.9969L10.2875 26.4063C10.4937 26.3813 10.5812 26.1282 10.4343 25.9813L9.06247 24.6125L13.2406 20.4375C13.3375 20.3407 13.3375 20.1813 13.2406 20.0844L11.9156 18.7594V18.7594Z"
                    fill="currentColor"
                />
            </svg>
        </BaseIcon>
    )
}

export function IconStepForward({ onClick, className = '' }: { onClick: () => void; className?: string }): JSX.Element {
    return (
        <BaseIcon onClick={onClick} className={className}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M21.1375 16.5297L9.1625 25.9366C8.71719 26.2866 8.0625 25.9709 8.0625 25.4069V6.59281C8.0625 6.02875 8.71719 5.71344 9.1625 6.06344L21.1375 15.4703C21.2179 15.5333 21.2828 15.6137 21.3275 15.7054C21.3722 15.7972 21.3955 15.8979 21.3955 16C21.3955 16.1021 21.3722 16.2028 21.3275 16.2946C21.2828 16.3864 21.2179 16.4667 21.1375 16.5297V16.5297ZM21.6875 27H23.6875C23.7538 27 23.8174 26.9737 23.8643 26.9268C23.9112 26.8799 23.9375 26.8163 23.9375 26.75V5.25C23.9375 5.1837 23.9112 5.12011 23.8643 5.07322C23.8174 5.02634 23.7538 5 23.6875 5H21.6875C21.6212 5 21.5576 5.02634 21.5107 5.07322C21.4638 5.12011 21.4375 5.1837 21.4375 5.25V26.75C21.4375 26.8163 21.4638 26.8799 21.5107 26.9268C21.5576 26.9737 21.6212 27 21.6875 27Z"
                    fill="currentColor"
                />
            </svg>
        </BaseIcon>
    )
}

export function IconStepBackward({
    onClick,
    className = '',
}: {
    onClick: () => void
    className?: string
}): JSX.Element {
    return (
        <BaseIcon onClick={onClick} className={className}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M10.8625 16.5297L22.8375 25.9366C23.2828 26.2866 23.9375 25.9709 23.9375 25.4069V6.59281C23.9375 6.02875 23.2828 5.71344 22.8375 6.06344L10.8625 15.4703C10.7821 15.5333 10.7172 15.6137 10.6725 15.7054C10.6278 15.7972 10.6045 15.8979 10.6045 16C10.6045 16.1021 10.6278 16.2028 10.6725 16.2946C10.7172 16.3864 10.7821 16.4667 10.8625 16.5297V16.5297ZM10.3125 27H8.3125C8.2462 27 8.18261 26.9737 8.13572 26.9268C8.08884 26.8799 8.0625 26.8163 8.0625 26.75V5.25C8.0625 5.1837 8.08884 5.12011 8.13572 5.07322C8.18261 5.02634 8.2462 5 8.3125 5H10.3125C10.3788 5 10.4424 5.02634 10.4893 5.07322C10.5362 5.12011 10.5625 5.1837 10.5625 5.25V26.75C10.5625 26.8163 10.5362 26.8799 10.4893 26.9268C10.4424 26.9737 10.3788 27 10.3125 27Z"
                    fill="currentColor"
                />
            </svg>
        </BaseIcon>
    )
}
