<template>
  <div ref="editor" id="blog-editor"></div>
</template>

<script lang="ts" >
import { TEXT_web_editor_markdown } from "../constants/text";
export default {
  mounted() {
    if (typeof window === 'undefined') {
      return;
    }

    this.$nextTick(async () => {
      const web_editor_markdown = await import('web-editor-markdown');
      let editor = new web_editor_markdown.Editor(this.$refs.editor);
      editor = web_editor_markdown.withUndoRedo(editor); // UndoRedo Plugin
      editor.insertTextAtCursor(TEXT_web_editor_markdown);
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