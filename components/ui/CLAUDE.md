# UI Components Guide

## Radix Hover Menus

When building hover-to-open menus with Radix primitives (DropdownMenu, Popover, etc.) inside the sidebar:

- **Always set `modal={false}`** — Radix modal mode sets `pointer-events: none` on `<body>` when the menu opens, which briefly drops `:hover` on the trigger and causes a visible flash
- **Use an open delay** (e.g., 150ms) so the menu doesn't fire the instant the cursor grazes the button
- **Use a longer close delay** (e.g., 300ms) to bridge the gap between trigger and portaled content
- **Never wrap the trigger in an extra div for mouse events** — put `onMouseEnter`/`onMouseLeave` directly on `DropdownMenuTrigger` (with `asChild` they merge onto the child)
