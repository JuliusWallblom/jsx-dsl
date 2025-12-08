@count = 0
@name::string = "World"

!increment = count++
!decrement = count--

<div>
  <h1>Hello {name}</h1>
  <p>Count: {count}</p>
  <button @click=increment>+</button>
  <button @click=decrement>-</button>
</div>
