import qrcode from 'qrcode'

import { Octokit } from '@octokit/rest'
import { useGithubConfig } from '../../config/blog'
import { formatDate } from '../client';



export const url2QRcore = (url: string): string => {
    let strImg = '';
    const qcode = qrcode.toString(url, { width: 64 }, (e, s) => {
        if (e) {
            console.log(e)
        }
        strImg = s
    })
    return strImg
}
export const url2Img = (url: string): string => {
    return `data:image/svg+xml;utf8,${encodeURIComponent(url2QRcore(url))}`
}


export const uploadImg = () => {
    const githubConfig = useGithubConfig();
    console.log(githubConfig)
    if (githubConfig?.update === undefined) {
        return
    }

    const path = formatDate(new Date(), "yyyyMMdd")

    console.log(githubConfig.update)
    console.log(path)

    let sha: string | undefined;

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    })



}