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

    <hr style="margin: 20px 0;" />
    <h2>🧪 Dynamic Runtime Tests</h2>

    <!-- Test 1: Pure Dynamic Variable -->
    <p style="background: #f0f0f0; padding: 10px;">
      Dynamic Variable: {{ $t(dynamicKey) }}
    </p>
    <button @click="toggleDynamic">Toggle Dynamic Key</button>

    <!-- Test 2: Ternary Operator -->
    <p style="background: #e0f7fa; padding: 10px;">
      Ternary Logic: {{ $t(isAdmin ? 'home.role.admin' : 'home.role.user') }}
    </p>
    <button @click="isAdmin = !isAdmin">Toggle Admin State</button>

    <hr style="margin: 20px 0;" />
    <p>{{ $t(getKey()) }}</p>
    <button @click="show = !show">show toast</button>
    <ToastTest v-if="show" @close="show = false" />
  </div>
</template>

<script setup lang="ts">

import ToastTest from "./ToastTest.vue";

// This file is just for testing the module in development.
const show = ref(false);

// ── NEW TEST STATE ──
const dynamicKey = ref('home.dynamic.first');
const isAdmin = ref(false);

const toggleDynamic = () => {
  dynamicKey.value = dynamicKey.value === 'home.dynamic.first'
    ? 'home.dynamic.second'
    : 'home.dynamic.first';
};

const testOnClick = () => {
  console.log("Button clicked!");
};

const getKey = () => {
  return "home.dynamic.first";
};
</script>
