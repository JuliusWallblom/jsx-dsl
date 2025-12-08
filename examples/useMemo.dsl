@items = []
@filter = ""

%filteredItems = items.filter(filter)
%total::number = items.length

<div>
  <p>Total items: {total}</p>
  <p>Filtered: {filteredItems}</p>
</div>
