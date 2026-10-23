<template>
  <div class="wrap nf">
    <h1>This kite drifted off</h1>
    <p class="lede">There is no page at this address. It may have been cut loose in an update.</p>
    <router-link class="btn" to="/">Back to the home page</router-link>
  </div>
</template>

<script>
export default { name: 'NotFoundPage' };
</script>

<style>
.nf { padding: clamp(60px, 10vw, 120px) var(--gutter); }
</style>
