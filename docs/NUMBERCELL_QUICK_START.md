# NumberCell Quick Start Guide

## For Developers: Adding NumberCell to Your Tables

### 1. Import the Component

```tsx
import { NumberCell } from '../../../components/table/NumberCell';
import { useAutoColumnSize, autoColumnClasses } from '../../../components/table/useAutoColumnSize';
```

### 2. Set Up Auto-Sizing

```tsx
function MyTableComponent() {
  const tableRef = useAutoColumnSize();
  
  return (
    <div className={autoColumnClasses.container}>
      <table ref={tableRef} className={autoColumnClasses.table}>
        {/* ... */}
      </table>
    </div>
  );
}
```

### 3. Replace Number Inputs

**Before:**
```tsx
<td>
  <input
    type="number"
    value={value}
    onChange={(e) => setValue(Number(e.target.value))}
    className="px-2 py-1 border rounded w-full"
  />
</td>
```

**After:**
```tsx
<td className={autoColumnClasses.tdNumeric}>
  <NumberCell
    value={value}
    onChange={(val) => setValue(val ?? 0)}
    decimals={2}
  />
</td>
```

### 4. Apply Column Classes

```tsx
<thead>
  <tr>
    <th className={autoColumnClasses.th}>Label</th>
    <th className={`${autoColumnClasses.th} text-right`}>Amount</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td className={autoColumnClasses.tdText}>
      <input type="text" {...} />
    </td>
    <td className={autoColumnClasses.tdNumeric}>
      <NumberCell {...} />
    </td>
  </tr>
</tbody>
```

### 5. Handle Excel Paste

```tsx
import { parseNumericInput } from '../../../lib/numberFormat';

function handlePaste(rows: string[][]) {
  const parsed = rows.map(row => ({
    label: row[0],
    amount: parseNumericInput(row[1]) ?? 0, // Handles "1,234.56"
  }));
  
  setValue('data', parsed);
}
```

## Common Patterns

### With React Hook Form

```tsx
const { watch, setValue } = useForm();
const watchedValues = watch('myArray');

<NumberCell
  value={watchedValues[index]?.amount ?? null}
  onChange={(val) => setValue(`myArray.${index}.amount`, val ?? 0, { 
    shouldDirty: true 
  })}
/>
```

### With State

```tsx
const [value, setValue] = useState<number | null>(null);

<NumberCell
  value={value}
  onChange={setValue}
/>
```

### With Validation

```tsx
<NumberCell
  value={value}
  onChange={setValue}
/>
{error && (
  <span className="text-red-600 text-xs block mt-1">
    {error.message}
  </span>
)}
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number \| null` | required | Current numeric value |
| `onChange` | `(val: number \| null) => void` | required | Change handler |
| `decimals` | `number` | `2` | Decimal places to display |
| `className` | `string` | `''` | Additional CSS classes |
| `autoFocusOnAdd` | `boolean` | `false` | Auto-focus on mount |
| `placeholder` | `string` | `'0'` | Placeholder text |
| `disabled` | `boolean` | `false` | Disable editing |
| `ariaLabel` | `string` | auto | Accessibility label |

## Formatting Functions

### Display Formatting
```tsx
import { formatNumberDisplay } from '../../../lib/numberFormat';

formatNumberDisplay(1234567) // "1,234,567"
formatNumberDisplay(1234.5, { minimumFractionDigits: 2 }) // "1,234.50"
```

### Parse Input
```tsx
import { parseNumericInput } from '../../../lib/numberFormat';

parseNumericInput('1,234.56') // 1234.56
parseNumericInput('1 234 567') // 1234567
parseNumericInput('invalid') // null
```

### Validation
```tsx
import { isValidNumericInput } from '../../../lib/numberFormat';

if (!isValidNumericInput(userInput)) {
  setError('Please enter a valid number');
}
```

## Styling Tips

### Align Numbers Right
```tsx
<th className={`${autoColumnClasses.th} text-right`}>Amount</th>
<td className={autoColumnClasses.tdNumeric}>
  <NumberCell {...} />
</td>
```

### Prevent Text Wrap
```tsx
// Numbers (no wrap)
<td className={autoColumnClasses.tdNumeric}>

// Text (can wrap)
<td className={autoColumnClasses.tdText}>
```

### Custom Width Constraints
```tsx
<table className={`${autoColumnClasses.table} max-w-4xl`}>
```

## Troubleshooting

### Numbers not formatting
- Check that `value` is a number, not a string
- Verify `decimals` prop is set correctly

### Paste not working
- Ensure using `parseNumericInput` in paste handler
- Check clipboard permissions

### Columns too narrow
- Apply `autoColumnClasses.container` to wrapper
- Use `useAutoColumnSize()` hook
- Check for conflicting `max-w-*` classes

### Edit mode not triggering
- Verify `disabled` prop is not set
- Check for `pointer-events-none` on parent

## Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { NumberCell } from './NumberCell';

test('displays formatted number', () => {
  render(<NumberCell value={1234567} onChange={() => {}} />);
  expect(screen.getByText('1,234,567')).toBeInTheDocument();
});

test('allows editing', async () => {
  const onChange = vi.fn();
  render(<NumberCell value={1234} onChange={onChange} />);
  
  const cell = screen.getByRole('button');
  fireEvent.click(cell);
  
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: '5678' } });
  fireEvent.blur(input);
  
  expect(onChange).toHaveBeenCalledWith(5678);
});
```
