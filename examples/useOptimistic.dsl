@todos = []
@optimisticTodos:optimistic = {todos, (state, newTodo) => state}

<div>
  <ul>
    <each item in optimisticTodos>
      <li>{item}</li>
    </each>
  </ul>
</div>
