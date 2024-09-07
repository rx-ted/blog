<template>
  <div ref="editor" id="blog-editor"></div>
</template>

<script >
import { Editor, withUndoRedo } from "web-editor-markdown";
import { web_editor_markdown } from "../constants/web-editor-markdown";

export default {
  mounted() {
    this.$nextTick(() => {
      // 确保 DOM 更新完成后访问元素
      let editor = new Editor(this.$refs.editor);
      editor = withUndoRedo(editor); // UndoRedo Plugin
      editor.insertTextAtCursor(web_editor_markdown);
    });
  },
};
</script>

<style lang="scss" scoped>
#blog-editor {
  width: 100%;
  min-height: 800px;
  display: flex;
  margin: 20px auto;
  justify-content: center;
}
</style>