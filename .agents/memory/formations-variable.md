---
name: Formations variable alias in AdminDashboard
description: The formations list in AdminDashboard is aliased as adminFormations, not formations
---

The `useAdminFormations()` hook result is destructured as:

```ts
const { formations: adminFormations, loading: formationsLoading, refresh: refreshFormations } = useAdminFormations();
```

**Why:** The component also receives or handles individual `formation` objects in dialogs, so using `adminFormations` avoids shadowing conflicts.

**How to apply:** Any new code in AdminDashboard.tsx that needs the full list of formations must reference `adminFormations`, not `formations`.
