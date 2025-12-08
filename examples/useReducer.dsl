@count:reducer = {0, {increment: s => s + 1, decrement: s => s - 1, reset: s => 0}}

<div>
  <p>Count: {count}</p>
  <button @click=increment>+</button>
  <button @click=decrement>-</button>
  <button @click=reset>Reset</button>
</div>
