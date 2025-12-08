#inputRef::HTMLInputElement

~focus = () => doFocus
~blur = () => doBlur

<div>
  <input ref={inputRef} placeholder="Controlled input" />
</div>
