"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pencil, Plus, RefreshCw, Settings2, Trash2 } from "lucide-react"
import {
  ConfirmDialog,
  EmptyState,
  FormDialog,
  FormSkeleton,
  PageHeader,
} from "@/components/common"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useNotification } from "@/components/ui/notification"
import { useAuth, isAdmin } from "@/lib/auth-context"
import {
  settingsService,
  type CreateSettingRequest,
  type GroupedSettings,
  type Setting,
  type UpdateSettingRequest,
} from "@/lib/api/settings"
import {
  buildSettingGroups,
  formatSettingKey,
  formatSettingValue,
  getSettingTypeLabel,
  getSettingTypeVariant,
} from "./settings-view-model"

type SettingDataType = CreateSettingRequest["data_type"]

const EMPTY_GROUPS: GroupedSettings = {
  branding: [],
  commission: [],
  tracking: [],
  email: [],
  registration: [],
  security: [],
  currency: [],
  other: [],
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { success, error } = useNotification()
  const fetchedRef = useRef(false)

  const [settings, setSettings] = useState<Setting[]>([])
  const [groupedSettings, setGroupedSettings] = useState<GroupedSettings>(EMPTY_GROUPS)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [selectedSettings, setSelectedSettings] = useState<Set<string>>(new Set())
  const [editingSetting, setEditingSetting] = useState<Setting | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deletingSetting, setDeletingSetting] = useState<Setting | null>(null)
  const [showMassDeleteDialog, setShowMassDeleteDialog] = useState(false)

  const fetchSettings = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      const [allSettings, grouped] = await Promise.all([
        settingsService.getAll(),
        settingsService.getGroupedSettings(),
      ])
      setSettings(allSettings)
      setGroupedSettings(grouped)
    } catch {
      error("Failed to load settings")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [error])

  useEffect(() => {
    if (fetchedRef.current || !isAdmin(user?.role)) return
    fetchedRef.current = true
    void fetchSettings()
  }, [fetchSettings, user?.role])

  const groups = useMemo(() => buildSettingGroups(groupedSettings), [groupedSettings])

  const handleCreate = async (payload: CreateSettingRequest) => {
    try {
      await settingsService.create(payload)
      success("Setting created successfully")
      setIsCreateOpen(false)
      await fetchSettings(true)
    } catch (submitError: any) {
      error(submitError?.message || "Failed to create setting")
    }
  }

  const handleUpdate = async (key: string, payload: UpdateSettingRequest) => {
    try {
      await settingsService.update(key, payload)
      success("Setting updated successfully")
      setEditingSetting(null)
      await fetchSettings(true)
    } catch (submitError: any) {
      error(submitError?.message || "Failed to update setting")
    }
  }

  const handleDelete = async () => {
    if (!deletingSetting) return

    try {
      await settingsService.delete(deletingSetting.settingKey)
      success("Setting deleted successfully")
      setSelectedSettings((current) => {
        const next = new Set(current)
        next.delete(deletingSetting.settingKey)
        return next
      })
      setDeletingSetting(null)
      await fetchSettings(true)
    } catch (submitError: any) {
      error(submitError?.message || "Failed to delete setting")
    }
  }

  const handleMassDelete = async () => {
    if (selectedSettings.size === 0) return

    try {
      await Promise.all(Array.from(selectedSettings).map((key) => settingsService.delete(key)))
      success(`Deleted ${selectedSettings.size} setting(s) successfully`)
      setSelectedSettings(new Set())
      setShowMassDeleteDialog(false)
      await fetchSettings(true)
    } catch (submitError: any) {
      error(submitError?.message || "Failed to delete settings")
    }
  }

  const handleInitializeDefaults = async () => {
    setIsInitializing(true)

    try {
      const result = await settingsService.initializeDefaultSettings()
      success(`Initialized ${result.created} default settings`)
      await fetchSettings(true)
    } catch (submitError: any) {
      error(submitError?.message || "Failed to initialize default settings")
    } finally {
      setIsInitializing(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedSettings.size === settings.length) {
      setSelectedSettings(new Set())
      return
    }

    setSelectedSettings(new Set(settings.map((setting) => setting.settingKey)))
  }

  const toggleSettingSelection = (settingKey: string, checked: boolean) => {
    setSelectedSettings((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(settingKey)
      } else {
        next.delete(settingKey)
      }
      return next
    })
  }

  if (!isAdmin(user?.role)) {
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage key-value configuration used across the platform."
        onRefresh={() => fetchSettings(true)}
        isRefreshing={isRefreshing}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {selectedSettings.size > 0 && (
              <Button variant="destructive" onClick={() => setShowMassDeleteDialog(true)}>
                <Trash2 className="size-4" />
                Delete {selectedSettings.size} selected
              </Button>
            )}
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" />
              Add setting
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <SettingsLoadingState />
      ) : settings.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              title="No settings found"
              description="Initialize defaults or create the first configuration entry."
              icon={Settings2}
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button onClick={handleInitializeDefaults} disabled={isInitializing}>
                    {isInitializing ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      "Initialize defaults"
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="size-4" />
                    Add setting
                  </Button>
                </div>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">System settings</CardTitle>
              <CardDescription>{settings.length} total settings across all categories.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedSettings.size > 0 && selectedSettings.size === settings.length}
                  onCheckedChange={(checked) => toggleSelectAll()}
                  aria-label="Select all settings"
                />
                <span className="text-sm text-muted-foreground">
                  {selectedSettings.size > 0 ? `${selectedSettings.size} selected` : "Select all"}
                </span>
              </div>
              <Button variant="outline" onClick={handleInitializeDefaults} disabled={isInitializing}>
                {isInitializing ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  "Initialize defaults"
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={groups[0]?.key ?? "other"} className="space-y-4">
              <TabsList className="h-auto flex-wrap justify-start">
                {groups.map((group) => (
                  <TabsTrigger key={group.key} value={group.key}>
                    {group.label}
                    <Badge variant="secondary" className="ml-2">
                      {group.settings.length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>

              {groups.map((group) => (
                <TabsContent key={group.key} value={group.key} className="mt-0">
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <span className="sr-only">Select</span>
                          </TableHead>
                          <TableHead>Setting</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.settings.map((setting) => (
                          <TableRow key={setting.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedSettings.has(setting.settingKey)}
                                onCheckedChange={(checked) =>
                                  toggleSettingSelection(setting.settingKey, checked === true)
                                }
                                aria-label={`Select ${setting.settingKey}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{formatSettingKey(setting.settingKey)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {setting.description || setting.settingKey}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getSettingTypeVariant(setting.dataType)}>
                                {getSettingTypeLabel(setting.dataType)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <code className="rounded bg-muted px-2 py-1 text-xs">
                                {formatSettingValue(setting)}
                              </code>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setEditingSetting(setting)}>
                                  <Pencil className="size-4" />
                                  <span className="sr-only">Edit {setting.settingKey}</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingSetting(setting)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="size-4" />
                                  <span className="sr-only">Delete {setting.settingKey}</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      <SettingFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onSave={handleCreate} />
      <SettingFormDialog setting={editingSetting} open={!!editingSetting} onOpenChange={() => setEditingSetting(null)} onSave={handleUpdate} />

      <ConfirmDialog
        open={!!deletingSetting}
        onOpenChange={(open) => !open && setDeletingSetting(null)}
        title="Delete setting?"
        description={
          deletingSetting
            ? `This will permanently remove "${deletingSetting.settingKey}".`
            : undefined
        }
        destructive
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={showMassDeleteDialog}
        onOpenChange={setShowMassDeleteDialog}
        title="Delete selected settings?"
        description={`This will permanently remove ${selectedSettings.size} setting(s).`}
        destructive
        confirmLabel="Delete all"
        onConfirm={handleMassDelete}
      />
    </div>
  )
}

function SettingsLoadingState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">System settings</CardTitle>
        <CardDescription>Loading configuration data.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormSkeleton fields={5} />
      </CardContent>
    </Card>
  )
}

function SettingFormDialog({
  setting,
  open,
  onOpenChange,
  onSave,
}: {
  setting?: Setting | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: ((data: CreateSettingRequest) => Promise<void>) | ((key: string, data: UpdateSettingRequest) => Promise<void>)
}) {
  const isEditing = Boolean(setting)
  const [settingKey, setSettingKey] = useState("")
  const [settingValue, setSettingValue] = useState("")
  const [dataType, setDataType] = useState<SettingDataType>("string")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return

    if (setting) {
      setSettingKey(setting.settingKey)
      setSettingValue(setting.settingValue)
      setDataType(setting.dataType)
      setDescription(setting.description || "")
    } else {
      setSettingKey("")
      setSettingValue("")
      setDataType("string")
      setDescription("")
    }
  }, [open, setting])

  const submitDisabled = isEditing ? !settingValue.trim() : !settingKey.trim() || !settingValue.trim()

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      if (setting) {
        await (onSave as (key: string, data: UpdateSettingRequest) => Promise<void>)(setting.settingKey, {
          setting_value: settingValue,
          description: description || undefined,
        })
      } else {
        await (onSave as (data: CreateSettingRequest) => Promise<void>)({
          setting_key: settingKey.trim(),
          setting_value: settingValue,
          data_type: dataType,
          description: description || undefined,
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit setting" : "Add setting"}
      description={isEditing ? setting?.settingKey : "Create a new system configuration entry."}
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Save changes" : "Create setting"}
      loading={isSubmitting}
      submitDisabled={submitDisabled}
    >
      {!isEditing && (
        <div className="space-y-2">
          <Label htmlFor="setting-key">Setting key</Label>
          <Input
            id="setting-key"
            value={settingKey}
            onChange={(event) => setSettingKey(event.target.value)}
            placeholder="e.g. default_commission_percentage"
          />
        </div>
      )}

      {!isEditing && (
        <div className="space-y-2">
          <Label htmlFor="setting-type">Data type</Label>
          <Select value={dataType} onValueChange={(value) => setDataType(value as SettingDataType)}>
            <SelectTrigger id="setting-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="string">String</SelectItem>
              <SelectItem value="int">Integer</SelectItem>
              <SelectItem value="float">Float</SelectItem>
              <SelectItem value="bool">Boolean</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Value</Label>
        {dataType === "bool" ? (
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <div className="text-sm font-medium">Boolean value</div>
              <div className="text-xs text-muted-foreground">
                {settingValue === "true" ? "Enabled" : "Disabled"}
              </div>
            </div>
            <Switch
              checked={settingValue === "true"}
              onCheckedChange={(checked) => setSettingValue(checked ? "true" : "false")}
            />
          </div>
        ) : dataType === "json" ? (
          <Textarea
            value={settingValue}
            onChange={(event) => setSettingValue(event.target.value)}
            rows={5}
            className="font-mono"
            placeholder='{"key":"value"}'
          />
        ) : (
          <Input
            value={settingValue}
            onChange={(event) => setSettingValue(event.target.value)}
            type={dataType === "int" || dataType === "float" ? "number" : "text"}
            step={dataType === "float" ? "0.01" : undefined}
          />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="setting-description">Description</Label>
        <Input
          id="setting-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional explanation for this setting"
        />
      </div>
    </FormDialog>
  )
}
