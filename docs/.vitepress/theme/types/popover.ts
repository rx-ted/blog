import type { ElButton } from 'element-plus'


export declare namespace BlogPopover {
    export interface Title {
        type: 'title'
        content: string
        style?: string
    }

    export interface Text {
        type: 'text'
        content: string
        style?: string
    }

    export interface Image {
        type: 'image'
        src: string
        style?: string
    }

    export interface Button {
        type: 'button'
        link: string
        content: string
        style?: string
        props?: InstanceType<typeof ElButton>['$props']
    }

    export type Value = Title | Text | Image | Button
}
