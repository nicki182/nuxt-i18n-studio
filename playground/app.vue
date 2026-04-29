<template>
  <div style="padding: 50px; font-family: sans-serif">
    <h1>{{ $t("home.title") }}</h1>
    <p>{{ $t("home.description", { name: "Nick" }) }}</p>
    <button style="cursor:not-allowed;" @click="testOnClick">{{ $t("home.button") }}</button>
  </div>
</template>
<script setup lang="ts">
// This file is just for testing the module in development. It won't be part of the final
// module code.
const testOnClick = () => {
  console.log("Button clicked!")
}
</script>
