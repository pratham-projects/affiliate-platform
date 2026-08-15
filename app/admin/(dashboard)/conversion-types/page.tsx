"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FormDialog,
  PageHeader,
  StatCard,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useNotification } from "@/components/ui/notification"
import { useAuth, isAdmin } from "@/lib/auth-context"
import { conversionTypesService, type ConversionType } from "@/lib/api"
import { buildConversionTypeSummary, validateConversionTypeForm } from "./conversion-types-view-model"

type ConversionTypeFormState = {
  name: string
  description: string
  isActive: boolean
}

const INITIAL_FORM: ConversionTypeFormState = {
  name: "",
  description: "",
  isActive: true,
}

export default function ConversionTypesPage() {
  const { user } = useAuth()
  const { success, error } = useNotification()
  const fetchedRef = useRef(false)

  const [conversionTypes, setConversionTypes] = useState<ConversionType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<ConversionType | null>(null)
  const [typeToDelete, setTypeToDelete] = useState<ConversionType | null>(null)
  const [form, setForm] = useState<ConversionTypeFormState>(INITIAL_FORM)

  const fetchConversionTypes = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      try {
        const data = await conversionTypesService.getAll()
        setConversionTypes(data)
      } catch (loadError: any) {
        error(loadError?.message || "Failed to load conversion types")
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [error],
  )

  useEffect(() => {
    if (fetchedRef.current || !isAdmin(user?.role)) return
    fetchedRef.current = true
    void fetchConversionTypes()
  }, [fetchConversionTypes, user?.role])

  const summary = useMemo(() => buildConversionTypeSummary(conversionTypes), [conversionTypes])

  const openCreate = () => {
    setEditingType(null)
    setForm(INITIAL_FORM)
    setIsDialogOpen(true)
  }

  const openEdit = (conversionType: ConversionType) => {
    setEditingType(conversionType)
    setForm({
      name: conversionType.name,
      description: conversionType.description ?? "",
      isActive: conversionType.isActive,
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    const validationErrors = validateConversionTypeForm(form)
    if (Object.keys(validationErrors).length > 0) {
      error(Object.values(validationErrors)[0] ?? "Invalid conversion type details")
      return
    }

    setIsSaving(true)

    try {
      if (editingType) {
        await conversionTypesService.update(editingType.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          isActive: form.isActive,
        })
        success("Conversion type updated")
      } else {
        await conversionTypesService.create({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          isActive: form.isActive,
        })
        success("Conversion type created")
      }

      setIsDialogOpen(false)
      await fetchConversionTypes(true)
    } catch (saveError: any) {
      error(saveError?.message || "Failed to save conversion type")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!typeToDelete) return

    setIsDeleting(true)
    try {
      await conversionTypesService.delete(typeToDelete.id)
      success("Conversion type deleted")
      setTypeToDelete(null)
      await fetchConversionTypes(true)
    } catch (deleteError: any) {
      error(deleteError?.message || "Failed to delete conversion type")
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: Column<ConversionType>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        cell: (conversionType) => (
          <div className="space-y-1">
            <div className="font-medium">{conversionType.name}</div>
            <div className="text-xs text-muted-foreground">{conversionType.description || "No description"}</div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (conversionType) => (
          <Badge variant={conversionType.isActive ? "default" : "secondary"}>
            {conversionType.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        key: "updatedAt",
        header: "Updated",
        cell: (conversionType) =>
          conversionType.updatedAt ? new Date(conversionType.updatedAt).toLocaleDateString("en-GB") : "N/A",
      },
      {
        key: "actions",
        header: "",
        className: "w-12 text-right",
        cell: (conversionType) => (
          <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={() => openEdit(conversionType)}>
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setTypeToDelete(conversionType)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  if (!isAdmin(user?.role)) {
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conversion Types"
        description="Manage the global catalog of conversion events affiliates can use."
        onRefresh={() => fetchConversionTypes(true)}
        isRefreshing={isRefreshing}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add conversion type
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total types" value={summary.total} />
        <StatCard label="Active" value={summary.active} />
        <StatCard label="Inactive" value={summary.inactive} />
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} columns={4} />
      ) : conversionTypes.length === 0 ? (
        <EmptyState
          title="No conversion types found"
          description="Create the first global conversion type."
          action={<Button onClick={openCreate}>Create conversion type</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          data={conversionTypes}
          rowKey={(conversionType) => conversionType.id}
          emptyTitle="No conversion types found"
          emptyDescription="Create the first global conversion type."
        />
      )}

      <FormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingType ? "Edit conversion type" : "Create conversion type"}
        description="Keep the catalog simple and reusable across affiliates."
        onSubmit={handleSave}
        submitLabel={editingType ? "Save changes" : "Create conversion type"}
        loading={isSaving}
      >
        <div className="space-y-2">
          <Label htmlFor="conversion-type-name">Name</Label>
          <Input id="conversion-type-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="conversion-type-description">Description</Label>
          <Textarea
            id="conversion-type-description"
            rows={3}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div className="space-y-1">
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">Inactive types stay in history but are hidden from new assignments.</p>
          </div>
          <Switch checked={form.isActive} onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))} />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!typeToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setTypeToDelete(null)
          }
        }}
        title="Delete conversion type?"
        description={`This will remove ${typeToDelete?.name ?? "this conversion type"} from the global catalog.`}
        confirmLabel="Delete"
        destructive
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
