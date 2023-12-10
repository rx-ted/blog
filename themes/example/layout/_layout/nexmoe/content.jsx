/*
 * @Author: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @Date: 2023-12-09 00:22:03
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2023-12-09 10:24:49
 * @FilePath: \hexo-theme-nexmoe\layout\_layout\nexmoe\content.jsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
const { Component } = require('inferno');

module.exports = class extends Component {
    render() {
        const { body } = this.props;

        return (
            <div
                class="nexmoe-primary"
                dangerouslySetInnerHTML={{ __html: body }}
            ></div>
        );
    }
};
