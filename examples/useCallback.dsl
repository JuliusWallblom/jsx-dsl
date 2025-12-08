@count = 0
^handleClick = () => count + 1
^handleReset = () => 0

<div>
  <p>Count: {count}</p>
  <button @click=handleClick>Increment</button>
  <button @click=handleReset>Reset</button>
</div>
