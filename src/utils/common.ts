import { ElNotification } from 'element-plus';
import { Theme, ThemeableImage } from '../types/theme';
import fm from 'front-matter';
import qrcode from 'qrcode';

export function url2QRcore(url: string): string {
    let strImg = '';
    qrcode.toString(url, { width: 64 }, (e, s) => {
        if (e) {
            console.log(e);
        }
        strImg = s;
    });
    return strImg;
}
export function url2Img(url: string): string {
    return `data:image/svg+xml;utf8,${encodeURIComponent(url2QRcore(url))}`;
}

export function replaceValue(str: string, value: any) {
    return str.replace(/\{\{value\}\}/, value);
}

export function wrapperCleanUrls(cleanUrls: boolean, route: string) {
    const tempUrl = route.replace(/\.html$/, '');
    return cleanUrls ? tempUrl : `${tempUrl}.html`;
}

export function isCurrentWeek(date: Date, target?: Date) {
    const now = target || new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneDay = 1000 * 60 * 60 * 24;
    const nowWeek = today.getDay();
    // 本周一的时间
    const startWeek = today.getTime() - (nowWeek === 0 ? 6 : nowWeek - 1) * oneDay;
    return +date >= startWeek && +date <= startWeek + 7 * oneDay;
}

export function getImageUrl(
    image: ThemeableImage,
    isDarkMode: boolean,
): string {
    if (typeof image === 'string') {
        // 如果 ThemeableImage 类型为 string，则直接返回字符串
        return image;
    }
    if ('src' in image) {
        // 如果 ThemeableImage 类型是一个对象，并且对象有 src 属性，则返回 src 属性对应的字符串
        return image.src;
    }
    if ('light' in image && 'dark' in image) {
        // 如果 ThemeableImage 类型是一个对象，并且对象同时有 light 和 dark 属性，则根据 isDarkMode 返回对应的 URL
        return isDarkMode ? image.dark : image.light;
    } // 如果 ThemeableImage 类型不是上述情况，则返回空字符串
    return '';
}

export function shuffleArray(arr: any[]) {
    const array = [...arr];
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const pattern
    = /[\w\u0392-\u03C9\u00C0-\u00FF\u0600-\u06FF\u0400-\u04FF]+|[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u3040-\u309F\uAC00-\uD7AF]+/g;

// copy from https://github.com/youngjuning/vscode-juejin-wordcount/blob/main/count-word.ts
export default function countWord(data: string) {
    const m = data.match(pattern);
    let count = 0;
    if (!m) {
        return 0;
    }
    for (let i = 0; i < m.length; i += 1) {
        if (m[i].charCodeAt(0) >= 0x4E00) {
            count += m[i].length;
        }
        else {
            count += 1;
        }
    }
    return count;
}

export const showNotification = (
    message = '该功能正在开发中，敬请期待！',
    title = '温馨提示',
    duration = 3000,
    showClose = false
) => {
    ElNotification.primary({
        title: title,
        message: message,
        duration: duration,
        showClose: showClose,
    });
};

export function parseMD(data: string) {
    const result = fm<Theme.PageMeta>(data);
    return result;
}

export function getYYYYMMDD() {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    return yyyymmdd;
}