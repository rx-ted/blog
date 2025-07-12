<script lang="ts" setup>
import { useMyOptions } from "../config/blog";
const my = useMyOptions();

let text = ''
if (my?.text) {
    text = my.text
    console.log(text)
}

</script>


<template>
</template>