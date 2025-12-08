@query = ""
@deferredQuery:deferred = query

<div>
  <input val={query} placeholder="Search..." />
  <p>Searching for: {deferredQuery}</p>
</div>
