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

    <!-- Test 3: Function Call inside $t -->
    <p>{{ $t(getKey()) }}</p>

    <hr style="margin: 20px 0;" />
    <h2>🧪 Script Mapping Tests</h2>

    <!-- Test 4: Variable assigned to t() in script -->
    <p style="background: #e8f5e9; padding: 10px;">
      Script translation: {{ scriptTranslatedLabel }}
    </p>

    <!-- Test 5: Computed property holding t() -->
    <p style="background: #fff3e0; padding: 10px;">
      Computed translation: {{ computedGreeting }}
    </p>
    <button @click="isMorning = !isMorning">Toggle Time</button>

    <hr style="margin: 20px 0;" />
    <button @click="show = !show">show toast</button>
    <ToastTest v-if="show" @close="show = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ToastTest from "./ToastTest.vue";

// Access the i18n composable
const { t } = useI18n();

// This file is just for testing the module in development.
const show = ref(false);

// ── NEW TEST STATE ──
const dynamicKey = ref('home.dynamic.first');
const isAdmin = ref(false);

// ── SCRIPT MAPPING STATE ──
// Test 4: Translating a key completely inside the script
const scriptTranslatedLabel = t('home.script.label');

// Test 5: Translating a key inside a computed property
const isMorning = ref(true);
const computedGreeting = computed(() => {
  return t(isMorning.value ? 'home.greeting.morning' : 'home.greeting.evening');
});

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
