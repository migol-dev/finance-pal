# Task: Business Rules — TxForm Account Filtering & ExternalPayee

> **Archivo objetivo:** [`src/pages/Movimientos.tsx`](../src/pages/Movimientos.tsx)
> **Función objetivo:** `TxForm` (líneas 675–827)
> **Estado:** 🔵 PLANIFICADO — sin cambios en código fuente aún

---

## 1. Contexto del sistema

### Tipos relevantes (`src/lib/finance.ts`)

```ts
// Tipo de transacción
type TxType = "income" | "expense" | "saving" | "transfer";

// Métodos de pago
type PaymentMethod = "cash" | "transfer" | "card" | "other";

// Cuenta bancaria
interface Account {
  id: string;
  name: string;
  type: "bank" | "cash" | "other";
  // ...
}

// Campos opcionales en Transaction para remitentes externos
interface Transaction {
  externalPayee?: { clabe?: string; bank?: string; name?: string };
  transferToAccountId?: string;
  // ...
}
```

### Estado actual de `TxForm`

| Estado local | Tipo | Descripción |
|---|---|---|
| `type` | `TxType` | Tipo de movimiento seleccionado |
| `paymentMethod` | `PaymentMethod` | Método de pago |
| `accountId` | `string \| undefined` | Cuenta de origen o destino principal |
| `transferToAccountId` | `string \| undefined` | Cuenta destino / `"__external"` |
| `externalPayee` | `object \| null` | Datos del remitente externo (CLABE, banco, nombre) |
| `cashAccount` | `Account \| undefined` | Primera cuenta con `type === "cash"` |
| `bankAccounts` | `Account[]` | Cuentas con `type !== "cash"` |

---

## 2. Reglas de negocio a implementar

### Regla 1 — Campos de remitente en Ingresos por transferencia

**Condición:** `type === "income"` **Y** `paymentMethod === "transfer"`

**Comportamiento esperado:**
- Mostrar la sección de campos de `externalPayee` (CLABE, banco, nombre del titular/remitente).
- El label debe decir **"Remitente"** (no "Destinatario" como en gastos).
- Los campos de `externalPayee` deben ser **opcionales** para `income` (a diferencia de `expense`/`saving` donde son requeridos si se selecciona `__external`).
- El `transferToAccountId` **no** se debe requerir para `income + transfer`; en cambio, se captura solo el `externalPayee`.

**Bug actual identificado (línea 802):**
```tsx
// ACTUAL — excluye income a menos que sea _virtual:
{type !== "transfer" && paymentMethod === "transfer" && (type !== "income" || (initial as any)?._virtual) && (
```
La condición `(type !== "income" || (initial as any)?._virtual)` oculta el bloque de `externalPayee` para `income` real. Esto es incorrecto según la Regla 1.

---

### Regla 2 — Filtrado de cuentas (OCULTAR efectivo)

**Condición:** `type !== "transfer"` **Y** (`paymentMethod === "transfer"` **O** `paymentMethod === "card"`)

**Comportamiento esperado:**
- En el `<Select>` de "Cuenta" (origen): mostrar **solo cuentas no-efectivo** (`a.type !== "cash"`).
- El efectivo (`cashAccount`) NO debe aparecer en la lista.

**Código actual con el problema (línea 785):**
```tsx
{(paymentMethod === "card" || paymentMethod === "transfer" || type === "transfer") &&
  accounts.map((a: Account) => (
    <SelectItem key={a.id} value={a.id}>
      {a.name} {a.type === "cash" ? "· Efectivo" : "· Banco"}
    </SelectItem>
  ))
}
```
`accounts.map(...)` sin filtrar incluye la cuenta de efectivo cuando `paymentMethod` es `"transfer"` o `"card"`.

---

### Regla 3 — Filtrado de cuentas (MOSTRAR SOLO efectivo)

**Condición:** `type !== "transfer"` **Y** `paymentMethod === "cash"`

**Comportamiento esperado:**
- En el `<Select>` de "Cuenta": mostrar **únicamente** la cuenta de efectivo (`cashAccount`).
- Las cuentas bancarias NO deben aparecer.

**Código actual con el problema (línea 784):**
```tsx
{paymentMethod === "cash" && cashAccount && (
  <SelectItem value={cashAccount.id}>{cashAccount.name} · Efectivo</SelectItem>
)}
{(paymentMethod === "card" || paymentMethod === "transfer" || type === "transfer") &&
  accounts.map((a: Account) => ( ... ))
}
```
Esto ya es correcto estructuralmente para `cash` (solo muestra `cashAccount`), pero la segunda condición podría incluir efectivo si el usuario cambia métodos. Hay que asegurar el filtro en la segunda condición.

---

## 3. Análisis detallado del código afectado

### 3.1 Bloque de "Cuenta origen" / "Cuenta" (líneas 779–788)

```tsx
// ACTUAL (línea 779)
{((type === "transfer") || (type !== "income" && paymentMethod !== "cash")) && (
  <div>
    <Label className="text-xs">{type === "transfer" ? "Cuenta origen" : "Cuenta"}</Label>
    <Select value={accountId} onValueChange={(v) => setAccountId(v)}>
      <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
      <SelectContent>
        {/* PROBLEMA: incluye efectivo cuando method=transfer/card */}
        {paymentMethod === "cash" && cashAccount && (
          <SelectItem value={cashAccount.id}>{cashAccount.name} · Efectivo</SelectItem>
        )}
        {(paymentMethod === "card" || paymentMethod === "transfer" || type === "transfer") &&
          accounts.map((a: Account) => (           // ← sin filtrar efectivo
            <SelectItem key={a.id} value={a.id}>
              {a.name} {a.type === "cash" ? "· Efectivo" : "· Banco"}
            </SelectItem>
          ))
        }
      </SelectContent>
    </Select>
  </div>
)}
```

**Corrección requerida:** Reemplazar `accounts.map(...)` por `accounts.filter(a => a.type !== "cash").map(...)` para los casos `"card"` y `"transfer"`.

---

### 3.2 Bloque de "Cuenta de destino" para income (líneas 790–800)

```tsx
// ACTUAL (línea 790)
{(type === "income" || type === "transfer") && (
  <div>
    <Label className="text-xs">
      {type === "transfer" ? "Cuenta destino" : "Cuenta de destino"}
    </Label>
    <Select ...>
      <SelectContent>
        {/* Solo muestra efectivo si income+cash */}
        {type === "income" && paymentMethod === "cash" && cashAccount && (
          <SelectItem value={cashAccount.id}>{cashAccount.name} · Efectivo</SelectItem>
        )}
        {/* Solo muestra no-efectivo si transfer o income+no-cash */}
        {(type === "transfer" || (type === "income" && paymentMethod !== "cash")) &&
          accounts.map((a: Account) => ( ... ))   // ← también sin filtrar para income
        }
      </SelectContent>
    </Select>
  </div>
)}
```

**Corrección requerida para Regla 2:** Para `income + transfer/card`, el select de destino debe mostrar solo cuentas no-efectivo: `accounts.filter(a => a.type !== "cash").map(...)`.

---

### 3.3 Bloque de "Destinatario" / externalPayee (líneas 802–822)

```tsx
// ACTUAL (línea 802) — EXCLUYE income real
{type !== "transfer" && paymentMethod === "transfer" && (type !== "income" || (initial as any)?._virtual) && (
  <div className="lg:col-span-2">
    <Label className="text-xs">Destinatario</Label>
    <Select value={transferToAccountId} onValueChange={...}>
      <SelectContent>
        {accounts.filter((a: Account) => a.id !== accountId).map(...)}
        <SelectItem value="__external">Cuenta externa (otra persona)</SelectItem>
      </SelectContent>
    </Select>
    {transferToAccountId === "__external" && (
      <div className="space-y-2 mt-2">
        <Input placeholder="CLABE (18 dígitos)" ... />
        <Input placeholder="Banco" ... />
        <Input placeholder="Nombre del titular" ... />
        {/* comprobante */}
      </div>
    )}
  </div>
)}
```

**Corrección para Regla 1:** El bloque debe dividirse en dos sub-bloques:

1. **Para `income + transfer`:** Mostrar directamente los campos de `externalPayee` (CLABE, banco, nombre del remitente) con label "Remitente", SIN el select de `transferToAccountId`. Los campos son opcionales.
2. **Para `expense/saving + transfer`:** Mantener el bloque actual (select de destinatario + campos de `__external`).

---

## 4. Derivados de lógica de guardado (`onSubmit`)

En el `onSubmit` (líneas 709–750), también hay que ajustar:

```tsx
// ACTUAL — línea 721: para income+transfer requiere transferToAccountId
if (type !== "income" && !transferToAccountId) {
  toast.error("Selecciona la cuenta destino");
  return;
}
```

**Para Regla 1:** Cuando `type === "income" && paymentMethod === "transfer"`:
- No requirir `transferToAccountId`.
- Guardar `externalPayee` si se llenó (opcional).
- `payload.accountId` = cuenta de destino (donde llega el ingreso).
- `payload.externalPayee` = datos del remitente (si se completaron).

---

## 5. Interfaces afectadas

| Interfaz/Componente | Tipo de cambio | Descripción |
|---|---|---|
| `TxForm` (líneas 675–827) | **Lógica de render** | Tres bloques de render JSX condicional |
| `TxForm.onSubmit` (líneas 709–750) | **Lógica de negocio** | Ajustar serialización para `income+transfer` |
| `Transaction.externalPayee` | Sin cambios | Ya soporta la estructura necesaria |
| `computeBalances` en `finance.ts` | Sin cambios | Ya maneja `income` con `accountId` |
| `transaction-slice.ts` | Sin cambios | Ya persiste `externalPayee` sin validación estricta |

---

## 6. Pasos de implementación (ordenados)

### Paso 1 — Derivar listas de cuentas filtradas con `useMemo`

**Ubicación:** Dentro de `TxForm`, después de la línea 698 (donde se define `bankAccounts`).

Agregar las listas derivadas:
```tsx
// Cuentas visibles en el select de "Cuenta" según método
const visibleAccounts = useMemo(() => {
  if (paymentMethod === "cash") return cashAccount ? [cashAccount] : [];
  if (paymentMethod === "transfer" || paymentMethod === "card") {
    return accounts.filter((a: Account) => a.type !== "cash");
  }
  return accounts;
}, [paymentMethod, accounts, cashAccount]);
```

> **Nota:** Usar `useMemo` con `[paymentMethod, accounts, cashAccount]` como dependencias.

---

### Paso 2 — Corregir el `<SelectContent>` de "Cuenta origen" (línea 783–786)

**Reemplazar** el bloque actual:
```tsx
// ANTES
{paymentMethod === "cash" && cashAccount && <SelectItem .../>}
{(paymentMethod === "card" || paymentMethod === "transfer" || type === "transfer") &&
  accounts.map((a: Account) => <SelectItem .../>)
}

// DESPUÉS — usar visibleAccounts
{visibleAccounts.map((a: Account) => (
  <SelectItem key={a.id} value={a.id}>
    {a.name} {a.type === "cash" ? "· Efectivo" : "· Banco"}
  </SelectItem>
))}
```

---

### Paso 3 — Corregir el `<SelectContent>` de "Cuenta de destino" para income (línea 794–796)

Para `income + transfer/card`, filtrar efectivo:
```tsx
// ANTES
{(type === "transfer" || (type === "income" && paymentMethod !== "cash")) &&
  accounts.map((a: Account) => <SelectItem .../>)
}

// DESPUÉS
{type === "income" && paymentMethod === "cash" && cashAccount && (
  <SelectItem value={cashAccount.id}>{cashAccount.name} · Efectivo</SelectItem>
)}
{(type === "transfer" || (type === "income" && paymentMethod !== "cash")) &&
  accounts
    .filter((a: Account) => type === "income" && paymentMethod !== "cash"
      ? a.type !== "cash"
      : true)
    .map((a: Account) => (
      <SelectItem key={a.id} value={a.id}>
        {a.name} {a.type === "cash" ? "· Efectivo" : "· Banco"}
      </SelectItem>
    ))
}
```

---

### Paso 4 — Refactorizar el bloque de externalPayee / Remitente (línea 802–822)

**Reemplazar** el bloque completo con dos ramas:

```tsx
{/* Regla 1: income + transfer → campos de remitente (opcionales) */}
{type === "income" && paymentMethod === "transfer" && (
  <div className="lg:col-span-2 space-y-2">
    <Label className="text-xs">Remitente (opcional)</Label>
    <Input
      placeholder="Nombre del remitente"
      value={externalPayee?.name ?? ""}
      onChange={(e) => setExternalPayee({ ...(externalPayee ?? {}), name: e.target.value })}
      className="h-10 rounded-xl"
    />
    <Input
      placeholder="Banco"
      value={externalPayee?.bank ?? ""}
      onChange={(e) => setExternalPayee({ ...(externalPayee ?? {}), bank: e.target.value })}
      className="h-10 rounded-xl"
    />
    <Input
      placeholder="CLABE (18 dígitos)"
      value={externalPayee?.clabe ?? ""}
      onChange={(e) => setExternalPayee({ ...(externalPayee ?? {}), clabe: e.target.value })}
      className="h-10 rounded-xl"
    />
  </div>
)}

{/* Regla existente: expense/saving + transfer → select de destinatario */}
{type !== "transfer" && type !== "income" && paymentMethod === "transfer" && (
  <div className="lg:col-span-2">
    <Label className="text-xs">Destinatario</Label>
    <Select value={transferToAccountId} onValueChange={(v) => setTransferToAccountId(v || undefined)}>
      <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Seleccione destinatario" /></SelectTrigger>
      <SelectContent>
        {accounts.filter((a: Account) => a.id !== accountId).map((a: Account) => (
          <SelectItem key={a.id} value={a.id}>Cuenta propia: {a.name}</SelectItem>
        ))}
        <SelectItem value="__external">Cuenta externa (otra persona)</SelectItem>
      </SelectContent>
    </Select>
    {transferToAccountId === "__external" && (
      <div className="space-y-2 mt-2">
        <Input placeholder="CLABE (18 dígitos)" value={externalPayee?.clabe ?? ""} onChange={(e) => setExternalPayee({ ...(externalPayee ?? {}), clabe: e.target.value })} className="h-10 rounded-xl" />
        <Input placeholder="Banco" value={externalPayee?.bank ?? ""} onChange={(e) => setExternalPayee({ ...(externalPayee ?? {}), bank: e.target.value })} className="h-10 rounded-xl" />
        <Input placeholder="Nombre del titular" value={externalPayee?.name ?? ""} onChange={(e) => setExternalPayee({ ...(externalPayee ?? {}), name: e.target.value })} className="h-10 rounded-xl" />
        <div>
          <Label className="text-xs">Comprobante</Label>
          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const reader = new FileReader(); reader.onload = () => setReceiptData(typeof reader.result === "string" ? reader.result : undefined); reader.readAsDataURL(f); }} />
        </div>
        {receiptData && <img src={receiptData} alt="comprobante" className="mt-1 rounded max-h-32 object-contain" />}
      </div>
    )}
  </div>
)}
```

---

### Paso 5 — Ajustar `onSubmit` para `income + transfer`

**Reemplazar** el bloque `else if (paymentMethod === "transfer")` (líneas 719–742):

```tsx
} else if (paymentMethod === "transfer") {
  if (!accountId) {
    toast.error(type === "income" ? "Selecciona la cuenta de destino" : "Selecciona la cuenta origen");
    return;
  }
  payload.accountId = accountId;

  if (type === "income") {
    // Regla 1: externalPayee es opcional; limpiar clabe si hay
    if (externalPayee?.clabe) {
      const cleanedClabe = externalPayee.clabe.replace(/\s+/g, "");
      if (cleanedClabe && !/^[0-9]{18}$/.test(cleanedClabe)) {
        toast.error("CLABE inválida (18 dígitos)");
        return;
      }
      payload.externalPayee = { ...externalPayee, clabe: cleanedClabe || undefined };
    } else if (externalPayee?.name || externalPayee?.bank) {
      payload.externalPayee = externalPayee;
    }
  } else {
    // Expense / saving: mantener lógica actual (destinatario requerido)
    if (!transferToAccountId) { toast.error("Selecciona la cuenta destino"); return; }
    if (transferToAccountId === "__external") {
      const c = externalPayee?.clabe ?? "";
      const cleanedClabe = c.replace(/\s+/g, "");
      if (!/^[0-9]{18}$/.test(cleanedClabe)) { toast.error("CLABE inválida (18 dígitos)"); return; }
      if (!externalPayee?.bank || !externalPayee?.name) { toast.error("Completa los datos del beneficiario externo"); return; }
      payload.externalPayee = { ...externalPayee, clabe: cleanedClabe };
    } else if (transferToAccountId) {
      payload.transferToAccountId = transferToAccountId;
    }
    // receipt handling (mantener igual)
    if (receiptData) {
      if (Capacitor.isNativePlatform()) {
        try {
          const m = receiptData.match(/^data:(image\/[^;]+);base64,(.*)$/);
          const base64 = m ? m[2] : receiptData.split(",")[1];
          const mime = m ? m[1] : "image/png";
          const ext = mime.split("/")[1] || "png";
          const fname = `receipt-${Date.now()}.${ext}`;
          const res = await Filesystem.writeFile({ path: `receipts/${fname}`, data: base64, directory: Directory.Data, encoding: Encoding.UTF8 });
          payload.receipt = res.uri ?? `receipts/${fname}`;
        } catch { payload.receipt = receiptData; }
      } else { payload.receipt = receiptData; }
    }
  }
}
```

---

## 7. Matriz de combinaciones type × method

| `type` | `method` | Cuenta visible | Muestra externalPayee |
|---|---|---|---|
| `income` | `cash` | Solo efectivo | ❌ |
| `income` | `transfer` | Solo banco/other | ✅ Remitente (opcional) |
| `income` | `card` | Solo banco/other | ❌ |
| `expense` | `cash` | Solo efectivo | ❌ |
| `expense` | `transfer` | Solo banco/other | ✅ Destinatario (requerido si __external) |
| `expense` | `card` | Solo banco/other | ❌ |
| `saving` | `cash` | Solo efectivo | ❌ |
| `saving` | `transfer` | Solo banco/other | ✅ Destinatario (requerido si __external) |
| `transfer` | *(N/A)* | Todas | ❌ (usa accounts internos) |

---

## 8. Precauciones y efectos secundarios

> [!WARNING]
> Al cambiar el método de pago en el form, el `accountId` puede quedar stale apuntando a una cuenta que ya no aparece en la lista filtrada. Hay que asegurarse de que el `useEffect` existente (línea 700–704) también resetee `accountId` cuando `visibleAccounts` no contenga el `accountId` actual.

> [!IMPORTANT]
> La función `computeBalances` en `finance.ts` ya soporta `income` con `accountId` explícito. Si `income + transfer` guarda `accountId` (cuenta de destino donde llega el dinero), el balance se calculará correctamente como crédito a esa cuenta.

> [!NOTE]
> El campo `externalPayee` en `income + transfer` es **solo informativo** (¿de dónde vino el dinero?). No afecta la lógica de balances; solo sirve para visualización en el historial.

---

## 9. Archivos que **NO** se deben tocar

- `src/lib/finance.ts` — Los tipos ya soportan `externalPayee` en `Transaction`.
- `src/store/slices/transaction-slice.ts` — No requiere cambios; ya persiste el `payload` tal como viene.
- `src/services/transactions.service.ts` — Sin cambios.
- Cualquier archivo de test existente — Se actualizarán por separado si es necesario.

---

## 10. Checklist de implementación

- [ ] Paso 1: Agregar `useMemo` `visibleAccounts` en `TxForm`
- [ ] Paso 2: Corregir `<SelectContent>` en bloque "Cuenta origen"
- [ ] Paso 3: Corregir `<SelectContent>` en bloque "Cuenta de destino" para `income`
- [ ] Paso 4: Refactorizar bloque `externalPayee` en dos ramas (`income` vs `expense/saving`)
- [ ] Paso 5: Ajustar `onSubmit` para serialización de `income + transfer`
- [ ] Verificar: cambio de método resetea `accountId` si queda fuera de `visibleAccounts`
- [ ] Verificar: UX — label "Remitente" vs "Destinatario" según contexto
- [ ] Verificar: que `saving + transfer` sigue funcionando igual que `expense + transfer`