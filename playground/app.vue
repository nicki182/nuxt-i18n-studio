<template>
  <div style="padding: 50px; font-family: sans-serif">
    <h1>{{ $t("home.title") }}</h1>
    <p>{{ $t("home.description", { name: "Nick" }) }}</p>
    <button style="cursor: not-allowed" @click="testOnClick">
      {{ $t("home.button") }}
    </button>
    <input type="text" :placeholder="$t('home.inputPlaceholder')" />
    <p>
      {{ $t("home.nested.value") }} and {{ $t("home.nested.anotherValue") }}
    </p>
    <p :aria-label="$t('home.text.ariaLabel')">{{ $t("home.text.label") }}</p>
    <button @click="show = !show">show toast</button>
    <ToastTest v-if="show" @close="show = false" />
  </div>
</template>

<script setup lang="ts">
import ToastTest from "./ToastTest.vue";

// This file is just for testing the module in development. It won't be part of the final
// module code.
const show = ref(false);

const testOnClick = () => {
  console.log("Button clicked!");
};
</script>
