import * as React from "react"
import {
  useDocumentPermissions,
  useDocumentState,
  useRegistry,
} from "@embedpdf/core/react"
import {
  ignore,
  PdfActionType,
  PdfAnnotationBorderStyle,
  PdfAnnotationReplyType,
  PdfAnnotationSubtype,
  PdfBlendMode,
  PdfErrorCode,
  PdfPermissionFlag,
  PdfZoomMode,
  uuidV4,
} from "@embedpdf/models";
import { useAnnotationCapability } from "@embedpdf/plugin-annotation/react"
import { useCapture } from "@embedpdf/plugin-capture/react"
import { useDocumentManagerCapability } from "@embedpdf/plugin-document-manager/react"
import { usePrint } from "@embedpdf/plugin-print/react"
import { useScroll } from "@embedpdf/plugin-scroll/react"
import { useSelectionCapability } from "@embedpdf/plugin-selection/react"
import {
  SignatureDrawPad,
  SignatureMode,
  SignatureTypePad,
  useSignatureCapability,
  useSignatureUpload,
} from "@embedpdf/plugin-signature/react";

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ColorPicker } from "@/components/extend/document-color-picker"
import {
  CopyGlyph,
  downloadBlob,
  DownloadGlyph,
  formatBytes,
  formatDateTime,
  formatShortcut,
  KeyGlyph,
  LockGlyph,
  PDF_EDITOR_SIGNATURE_FONTS,
  PdfEditorCheckbox,
  PdfEditorFieldLabel,
  PdfEditorSection,
  PdfEditorSwatch,
  ShieldGlyph,
  UnlockGlyph,
  usePdfEditor,
} from "@/components/extend/pdf-editor-shared"
import { IconPlaceholder } from "@/components/icon-placeholder"

/* -------------------------------------------------------------------------- */
/* Confirm                                                                    */
/* -------------------------------------------------------------------------- */
export function PdfEditorConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export function PdfEditorPrintDialog({
  documentId,
  open,
  onOpenChange
}) {
  const { provides: print } = usePrint(documentId)
  const { state: scrollState } = useScroll(documentId)
  const { notify } = usePdfEditor()
  const [selection, setSelection] = React.useState("all")
  const [customPages, setCustomPages] = React.useState("")
  const [includeAnnotations, setIncludeAnnotations] = React.useState(true)
  const [isPrinting, setIsPrinting] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [previousOpen, setPreviousOpen] = React.useState(open)
  if (previousOpen !== open) {
    setPreviousOpen(open)
    if (!open) {
      setSelection("all")
      setCustomPages("")
      setIncludeAnnotations(true)
      setIsPrinting(false)
      setError(null)
    }
  }
  const canSubmit =
    !isPrinting && (selection !== "custom" || customPages.trim().length > 0)
  const handlePrint = () => {
    if (!print || !canSubmit) return
    const options = {
      includeAnnotations,
      pageRange:
        selection === "current"
          ? String(scrollState.currentPage)
          : selection === "custom"
            ? customPages.trim()
            : undefined,
    }
    setIsPrinting(true)
    setError(null)
    print.print(options).wait(
      () => {
        setIsPrinting(false)
        onOpenChange(false)
      },
      (failure) => {
        setIsPrinting(false)
        const message =
          failure?.reason?.message ?? "The document could not be printed."
        setError(message)
        notify(message, "error")
      }
    )
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Print</DialogTitle>
          <DialogDescription>
            Prepares a print-ready copy and opens the browser print dialog.
          </DialogDescription>
        </DialogHeader>
        <InlineDialogPanel className="space-y-5">
          <PdfEditorSection title="Pages">
            <div className="space-y-1">
              <PdfEditorCheckbox
                checked={selection === "all"}
                onCheckedChange={() => setSelection("all")}
                label="All pages"
              />
              <PdfEditorCheckbox
                checked={selection === "current"}
                onCheckedChange={() => setSelection("current")}
                label={`Current page (${scrollState.currentPage || 1})`}
              />
              <PdfEditorCheckbox
                checked={selection === "custom"}
                onCheckedChange={() => setSelection("custom")}
                label="Page range"
              />
            </div>
            <Input
              placeholder="e.g. 1-3, 5, 8-10"
              value={customPages}
              disabled={selection !== "custom"}
              onChange={(event) =>
                setCustomPages(event.target.value)
              }
              onFocus={() => setSelection("custom")}
            />
            <div className="text-xs text-muted-foreground">
              {scrollState.totalPages} pages in this document.
            </div>
          </PdfEditorSection>
          <PdfEditorSection title="Options">
            <PdfEditorCheckbox
              checked={includeAnnotations}
              onCheckedChange={setIncludeAnnotations}
              label="Include annotations and form values"
            />
          </PdfEditorSection>
          {error ? (
            <div className="text-xs text-destructive">{error}</div>
          ) : null}
        </InlineDialogPanel>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPrinting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <InlineLoadingButton
            type="button"
            loading={isPrinting}
            disabled={!canSubmit || !print}
            onClick={handlePrint}
          >
            Print
          </InlineLoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function PdfEditorCaptureDialog({
  documentId
}) {
  const { provides: capture } = useCapture(documentId)
  const { fileName, notify, onCapture } = usePdfEditor()
  const [result, setResult] = React.useState(null)
  const onCaptureRef = React.useRef(onCapture)
  React.useEffect(() => {
    onCaptureRef.current = onCapture
  })
  React.useEffect(() => {
    if (!capture) return
    return capture.onCaptureArea((event) => {
      onCaptureRef.current?.(event)
      setResult((previous) => {
        if (previous) URL.revokeObjectURL(previous.url)
        return {
          pageIndex: event.pageIndex,
          blob: event.blob,
          imageType: event.imageType,
          url: URL.createObjectURL(event.blob),
        }
      })
    })
  }, [capture])
  React.useEffect(
    () => () => {
      if (result) URL.revokeObjectURL(result.url)
    },
    [result]
  )
  const close = () => setResult(null)
  const extension = result?.imageType.split("/")[1] ?? "png"
  const captureFileName = `${fileName.replace(/\.pdf$/i, "")}-page-${(result?.pageIndex ?? 0) + 1}.${extension}`
  const canCopy =
    typeof navigator !== "undefined" &&
    typeof window !== "undefined" &&
    "ClipboardItem" in window &&
    Boolean(navigator.clipboard?.write)
  return (
    <Dialog
      open={result !== null}
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Captured area</DialogTitle>
          <DialogDescription>
            Page {(result?.pageIndex ?? 0) + 1} ·{" "}
            {formatBytes(result?.blob.size)}
          </DialogDescription>
        </DialogHeader>
        <InlineDialogPanel>
          <div className="grid place-items-center rounded-lg border bg-muted/40 p-3">
            {result ? (
              <img
                src={result.url}
                alt={`Captured area from page ${result.pageIndex + 1}`}
                className="max-h-[52vh] max-w-full rounded-md shadow-sm"
              />
            ) : null}
          </div>
        </InlineDialogPanel>
        <DialogFooter>
          {canCopy ? (
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (!result) return
                try {
                  await navigator.clipboard.write([
                    new ClipboardItem({ [result.imageType]: result.blob }),
                  ])
                  notify("Image copied to the clipboard.", "success")
                } catch {
                  notify("The image could not be copied.", "error")
                }
              }}
            >
              <CopyGlyph className="size-4" />
              Copy image
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={() => {
              if (!result) return
              downloadBlob(result.blob, captureFileName)
              close()
            }}
          >
            <DownloadGlyph className="size-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
/* -------------------------------------------------------------------------- */
/* Security                                                                   */
/* -------------------------------------------------------------------------- */
const PERMISSION_OPTIONS = [
  {
    flag: PdfPermissionFlag.Print,
    label: "Print",
    description: "Allow printing, possibly at reduced quality.",
  },
  {
    flag: PdfPermissionFlag.PrintHighQuality,
    label: "Print in high quality",
    description: "Allow full-resolution printing.",
  },
  {
    flag: PdfPermissionFlag.ModifyContents,
    label: "Modify contents",
    description: "Allow editing the page content.",
  },
  {
    flag: PdfPermissionFlag.CopyContents,
    label: "Copy text and images",
    description: "Allow copying and extracting content.",
  },
  {
    flag: PdfPermissionFlag.ModifyAnnotations,
    label: "Annotate",
    description: "Allow adding and changing annotations.",
  },
  {
    flag: PdfPermissionFlag.FillForms,
    label: "Fill forms",
    description: "Allow filling in existing form fields.",
  },
  {
    flag: PdfPermissionFlag.ExtractForAccessibility,
    label: "Extract for accessibility",
    description: "Allow assistive technologies to read the content.",
  },
  {
    flag: PdfPermissionFlag.AssembleDocument,
    label: "Assemble pages",
    description: "Allow inserting, rotating, and deleting pages.",
  },
]
function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoFocus,
  onEnter
}) {
  return (
    <Input
      id={id}
      type="password"
      autoComplete="off"
      value={value}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(event) =>
        onChange(event.target.value)
      }
      onKeyDown={(event) => {
        if (event.key === "Enter") onEnter?.()
      }}
    />
  );
}
export function PdfEditorSecurityDialog({
  documentId,
  open,
  onOpenChange
}) {
  const { provides: documentManager } = useDocumentManagerCapability()
  const documentState = useDocumentState(documentId)
  const permissions = useDocumentPermissions(documentId)
  const { notify } = usePdfEditor()
  const document = documentState?.document ?? null
  const isEncrypted = document?.isEncrypted ?? false
  const isOwnerUnlocked = document?.isOwnerUnlocked ?? false
  const needsOwnerUnlock = isEncrypted && !isOwnerUnlocked
  const [unlockPassword, setUnlockPassword] = React.useState("")
  const [isUnlocking, setIsUnlocking] = React.useState(false)
  const [requireOpenPassword, setRequireOpenPassword] = React.useState(false)
  const [openPassword, setOpenPassword] = React.useState("")
  const [confirmOpenPassword, setConfirmOpenPassword] = React.useState("")
  const [restrictPermissions, setRestrictPermissions] = React.useState(false)
  const [ownerPassword, setOwnerPassword] = React.useState("")
  const [confirmOwnerPassword, setConfirmOwnerPassword] = React.useState("")
  const [allowedFlags, setAllowedFlags] = React.useState(() => new Set(PERMISSION_OPTIONS.map((option) => option.flag)))
  const [isApplying, setIsApplying] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [previousOpen, setPreviousOpen] = React.useState(open)
  if (previousOpen !== open) {
    setPreviousOpen(open)
    if (open) {
      setUnlockPassword("")
      setIsUnlocking(false)
      setRequireOpenPassword(false)
      setOpenPassword("")
      setConfirmOpenPassword("")
      setRestrictPermissions(false)
      setOwnerPassword("")
      setConfirmOwnerPassword("")
      setAllowedFlags(new Set(PERMISSION_OPTIONS.map((option) => option.flag)))
      setIsApplying(false)
      setError(null)
    }
  }
  const openPasswordValid =
    !requireOpenPassword ||
    (openPassword.length > 0 && openPassword === confirmOpenPassword)
  const ownerPasswordValid =
    !restrictPermissions ||
    (ownerPassword.length > 0 && ownerPassword === confirmOwnerPassword)
  const canApply =
    !isApplying &&
    (requireOpenPassword || restrictPermissions) &&
    openPasswordValid &&
    ownerPasswordValid
  const handleUnlock = () => {
    if (!documentManager || !unlockPassword.trim()) return
    setIsUnlocking(true)
    setError(null)
    documentManager.unlockOwnerPermissions(documentId, unlockPassword).wait(
      (success) => {
        setIsUnlocking(false)
        if (success) {
          setUnlockPassword("")
          notify("Owner permissions unlocked.", "success")
        } else {
          setError("The owner password is incorrect.")
        }
      },
      (failure) => {
        setIsUnlocking(false)
        setError(
          failure?.reason?.message ?? "The document could not be unlocked."
        )
      }
    )
  }
  const handleApply = () => {
    if (!documentManager || !canApply) return
    let flags = PdfPermissionFlag.AllowAll
    if (restrictPermissions) {
      flags = 0
      for (const flag of allowedFlags) flags |= flag
    }
    const userPassword = requireOpenPassword ? openPassword : ""
    const resolvedOwnerPassword = restrictPermissions
      ? ownerPassword
      : requireOpenPassword
        ? openPassword
        : ""
    setIsApplying(true)
    setError(null)
    documentManager
      .setDocumentEncryption(documentId, {
        userPassword,
        ownerPassword: resolvedOwnerPassword,
        allowedFlags: flags,
      })
      .wait(
        (success) => {
          setIsApplying(false)
          if (success) {
            notify(
              "Protection is applied the next time you download the document.",
              "success"
            )
            onOpenChange(false)
          } else {
            setError("The protection settings could not be applied.")
          }
        },
        (failure) => {
          setIsApplying(false)
          setError(
            failure?.reason?.message ??
              "The protection settings could not be applied."
          )
        }
      )
  }
  const handleRemove = () => {
    if (!documentManager) return
    setIsApplying(true)
    setError(null)
    documentManager.removeEncryption(documentId).wait(
      (success) => {
        setIsApplying(false)
        if (success) {
          notify(
            "Protection is removed the next time you download the document.",
            "success"
          )
          onOpenChange(false)
        } else {
          setError("The protection could not be removed.")
        }
      },
      (failure) => {
        setIsApplying(false)
        setError(
          failure?.reason?.message ?? "The protection could not be removed."
        )
      }
    )
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Security</DialogTitle>
          <DialogDescription>
            Passwords and permissions are written into the PDF when you download
            it.
          </DialogDescription>
        </DialogHeader>
        <InlineDialogPanel className="space-y-5">
          <PdfEditorSection title="Current status">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {isEncrypted ? (
                <Badge variant="secondary">
                  <LockGlyph className="size-3" />
                  Encrypted
                </Badge>
              ) : (
                <Badge variant="outline">
                  <UnlockGlyph className="size-3" />
                  Not encrypted
                </Badge>
              )}
              {isEncrypted ? (
                <Badge variant={isOwnerUnlocked ? "secondary" : "outline"}>
                  <KeyGlyph className="size-3" />
                  {isOwnerUnlocked ? "Owner unlocked" : "Owner locked"}
                </Badge>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {PERMISSION_OPTIONS.map((option) => {
                const allowed = permissions.hasPermission(option.flag)
                return (
                  <div key={option.flag} className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-1.5 rounded-full",
                        allowed ? "bg-emerald-500" : "bg-destructive"
                      )}
                    />
                    <span className={cn(!allowed && "line-through")}>
                      {option.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </PdfEditorSection>

          {needsOwnerUnlock ? (
            <PdfEditorSection title="Unlock owner permissions">
              <div className="text-xs text-muted-foreground">
                Enter the owner password to change protection settings.
              </div>
              <div className="flex gap-2">
                <PasswordInput
                  value={unlockPassword}
                  placeholder="Owner password"
                  onChange={setUnlockPassword}
                  onEnter={handleUnlock}
                />
                <InlineLoadingButton
                  type="button"
                  variant="outline"
                  loading={isUnlocking}
                  disabled={!unlockPassword.trim()}
                  onClick={handleUnlock}
                >
                  Unlock
                </InlineLoadingButton>
              </div>
            </PdfEditorSection>
          ) : null}

          <PdfEditorSection title="Open password">
            <PdfEditorCheckbox
              checked={requireOpenPassword}
              disabled={needsOwnerUnlock}
              onCheckedChange={setRequireOpenPassword}
              label="Require a password to open the document"
            />
            {requireOpenPassword ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <PasswordInput
                  value={openPassword}
                  placeholder="Password"
                  onChange={setOpenPassword}
                />
                <PasswordInput
                  value={confirmOpenPassword}
                  placeholder="Confirm password"
                  onChange={setConfirmOpenPassword}
                />
                {!openPasswordValid && confirmOpenPassword ? (
                  <div className="text-xs text-destructive sm:col-span-2">
                    The passwords do not match.
                  </div>
                ) : null}
              </div>
            ) : null}
          </PdfEditorSection>

          <PdfEditorSection title="Permissions">
            <PdfEditorCheckbox
              checked={restrictPermissions}
              disabled={needsOwnerUnlock}
              onCheckedChange={setRestrictPermissions}
              label="Restrict what readers can do"
              description="Requires an owner password to lift the restrictions later."
            />
            {restrictPermissions ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <PasswordInput
                    value={ownerPassword}
                    placeholder="Owner password"
                    onChange={setOwnerPassword}
                  />
                  <PasswordInput
                    value={confirmOwnerPassword}
                    placeholder="Confirm owner password"
                    onChange={setConfirmOwnerPassword}
                  />
                  {!ownerPasswordValid && confirmOwnerPassword ? (
                    <div className="text-xs text-destructive sm:col-span-2">
                      The passwords do not match.
                    </div>
                  ) : null}
                </div>
                <div className="grid gap-1 sm:grid-cols-2">
                  {PERMISSION_OPTIONS.map((option) => (
                    <PdfEditorCheckbox
                      key={option.flag}
                      checked={allowedFlags.has(option.flag)}
                      onCheckedChange={(checked) =>
                        setAllowedFlags((previous) => {
                          const next = new Set(previous)
                          if (checked) {
                            next.add(option.flag)
                          } else {
                            next.delete(option.flag)
                          }
                          return next
                        })
                      }
                      label={option.label}
                      description={option.description}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </PdfEditorSection>

          {error ? (
            <div className="text-xs text-destructive">{error}</div>
          ) : null}
        </InlineDialogPanel>
        <DialogFooter>
          {isEncrypted && !needsOwnerUnlock ? (
            <Button
              type="button"
              disabled={isApplying}
              onClick={handleRemove}
              variant={"outline"}
              className={cn(
                "border-destructive/32 text-destructive hover:bg-destructive/10",
                "sm:mr-auto"
              )}
            >
              Remove protection
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={isApplying}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <InlineLoadingButton
            type="button"
            loading={isApplying}
            disabled={!canApply || needsOwnerUnlock}
            onClick={handleApply}
          >
            <ShieldGlyph className="size-4" />
            Apply protection
          </InlineLoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
const EMPTY_METADATA = {
  title: "",
  author: "",
  subject: "",
  keywords: "",
  creator: "",
  producer: "",
}
export function PdfEditorPropertiesDialog({
  documentId,
  open,
  onOpenChange
}) {
  const { registry } = useRegistry()
  const documentState = useDocumentState(documentId)
  const permissions = useDocumentPermissions(documentId)
  const { fileName, notify } = usePdfEditor()
  const document = documentState?.document ?? null
  const [metadata, setMetadata] =
    React.useState(EMPTY_METADATA)
  const [dates, setDates] = React.useState({ creationDate: null, modificationDate: null })
  const [isLoading, setIsLoading] = React.useState(
    Boolean(open && registry && document)
  )
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [metadataRequest, setMetadataRequest] = React.useState({
    document,
    open,
    registry,
  })
  if (
    metadataRequest.document !== document ||
    metadataRequest.open !== open ||
    metadataRequest.registry !== registry
  ) {
    setMetadataRequest({ document, open, registry })
    setIsLoading(Boolean(open && registry && document))
    setError(null)
  }
  React.useEffect(() => {
    if (!open || !registry || !document) return
    let cancelled = false
    registry
      .getEngine()
      .getMetadata(document)
      .wait(
        (result) => {
          if (cancelled) return
          setMetadata({
            title: result.title ?? "",
            author: result.author ?? "",
            subject: result.subject ?? "",
            keywords: result.keywords ?? "",
            creator: result.creator ?? "",
            producer: result.producer ?? "",
          })
          setDates({
            creationDate: result.creationDate ?? null,
            modificationDate: result.modificationDate ?? null,
          })
          setIsLoading(false)
        },
        (failure) => {
          if (cancelled) return
          setError(
            failure?.reason?.message ??
              "The document metadata could not be read."
          )
          setIsLoading(false)
        }
      )
    return () => {
      cancelled = true
    }
  }, [document, open, registry])
  const updateField = (key, value) =>
    setMetadata((previous) => ({ ...previous, [key]: value }))
  const handleSave = () => {
    if (!registry || !document) return
    setIsSaving(true)
    setError(null)
    registry
      .getEngine()
      .setMetadata(document, {
        title: metadata.title,
        author: metadata.author,
        subject: metadata.subject,
        keywords: metadata.keywords,
        creator: metadata.creator,
        producer: metadata.producer,
        modificationDate: new Date(),
      })
      .wait(
        () => {
          setIsSaving(false)
          notify("Document properties saved.", "success")
          onOpenChange(false)
        },
        (failure) => {
          setIsSaving(false)
          setError(
            failure?.reason?.message ??
              "The document metadata could not be saved."
          )
        }
      )
  }
  const firstPage = document?.pages[0]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Document properties</DialogTitle>
          <DialogDescription>{fileName}</DialogDescription>
        </DialogHeader>
        <InlineDialogPanel className="space-y-5">
          {isLoading ? (
            <div className="grid place-items-center py-8">
              <InlineSpinner className="size-4" />
            </div>
          ) : (
            <>
              <PdfEditorSection title="Description">
                <div className="grid gap-3">
                  {(
                    [
                      ["title", "Title"],
                      ["author", "Author"],
                      ["subject", "Subject"],
                      ["keywords", "Keywords"],
                      ["creator", "Creator"],
                      ["producer", "Producer"]
                    ]
                  ).map(([key, label]) => (
                    <div key={key} className="grid gap-1">
                      <PdfEditorFieldLabel htmlFor={`pdf-editor-meta-${key}`}>
                        {label}
                      </PdfEditorFieldLabel>
                      <Input
                        id={`pdf-editor-meta-${key}`}
                        value={metadata[key]}
                        disabled={!permissions.canModifyContents}
                        onChange={(
                          event
                        ) => updateField(key, event.target.value)}
                        className={cn("h-8 px-2.5")}
                      />
                    </div>
                  ))}
                </div>
              </PdfEditorSection>
              <PdfEditorSection title="Details">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
                  <dt className="text-muted-foreground">Pages</dt>
                  <dd>{document?.pageCount ?? "—"}</dd>
                  <dt className="text-muted-foreground">Page size</dt>
                  <dd>
                    {firstPage
                      ? `${Math.round(firstPage.size.width)} × ${Math.round(firstPage.size.height)} pt`
                      : "—"}
                  </dd>
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{formatDateTime(dates.creationDate)}</dd>
                  <dt className="text-muted-foreground">Modified</dt>
                  <dd>{formatDateTime(dates.modificationDate)}</dd>
                  <dt className="text-muted-foreground">Security</dt>
                  <dd>
                    {document?.isEncrypted
                      ? "Password protected"
                      : "No protection"}
                  </dd>
                </dl>
              </PdfEditorSection>
              {error ? (
                <div className="text-xs text-destructive">{error}</div>
              ) : null}
            </>
          )}
        </InlineDialogPanel>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <InlineLoadingButton
            type="button"
            loading={isSaving}
            disabled={isLoading || !permissions.canModifyContents}
            onClick={handleSave}
          >
            Save
          </InlineLoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
const SIGNATURE_COLORS = [
  { name: "Black", value: "#111827" },
  { name: "Blue", value: "#1d4ed8" },
  { name: "Red", value: "#dc2626" },
]
function useSignatureFontsStylesheet(url, enabled) {
  React.useEffect(() => {
    if (!enabled || !url || typeof document === "undefined") return
    const existing = document.querySelector(`link[data-pdf-editor-signature-fonts="${CSS.escape(url)}"]`)
    if (existing) return
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = url
    link.dataset.pdfEditorSignatureFonts = url
    document.head.append(link)
  }, [enabled, url])
}
function SignatureUploadZone({
  inputRef,
  accept,
  isDragging,
  previewUrl,
  placeholder,
  onOpen,
  onFileInputChange,
  onDrop,
  onDragOver,
  onDragLeave
}) {
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => onFileInputChange(event.nativeEvent)}
      />
      <button
        type="button"
        onClick={onOpen}
        onDrop={(event) => {
          event.preventDefault()
          onDrop(event.nativeEvent)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          onDragOver(event.nativeEvent)
        }}
        onDragLeave={() => onDragLeave()}
        className={cn(
          "flex h-full w-full items-center justify-center rounded-md border-2 border-dashed transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-input hover:border-muted-foreground/60"
        )}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Uploaded signature"
            className="max-h-[90%] max-w-[90%] object-contain"
          />
        ) : (
          <span className="px-4 text-center text-xs text-muted-foreground">
            {placeholder}
          </span>
        )}
      </button>
    </>
  )
}
function SignaturePad({
  tab,
  color,
  fontFamily,
  placeholder,
  uploadPlaceholder,
  drawRef,
  typeRef,
  upload,
  onResult
}) {
  return (
    <div className="h-full w-full">
      {tab === "draw" ? (
        <SignatureDrawPad
          onResult={onResult}
          padRef={(handle) => {
            drawRef.current = handle
          }}
          strokeColor={color}
          strokeWidth={3}
          className="h-full w-full rounded-md border border-input bg-white"
        />
      ) : null}
      {tab === "type" ? (
        <SignatureTypePad
          onResult={onResult}
          padRef={(handle) => {
            typeRef.current = handle
          }}
          fontFamily={fontFamily}
          fontSize={40}
          color={color}
          placeholder={placeholder}
          className="h-full w-full rounded-md border border-input bg-white px-3 py-2 text-3xl text-slate-950 outline-none dark:bg-white dark:text-slate-950"
        />
      ) : null}
      {tab === "upload" ? (
        <SignatureUploadZone
          inputRef={upload.inputRef}
          accept={upload.accept}
          isDragging={upload.isDragging}
          previewUrl={upload.previewUrl}
          placeholder={uploadPlaceholder}
          onOpen={upload.openFilePicker}
          onFileInputChange={upload.handleFileInputChange}
          onDrop={upload.handleDrop}
          onDragOver={upload.handleDragOver}
          onDragLeave={upload.handleDragLeave}
        />
      ) : null}
    </div>
  )
}
export function PdfEditorSignatureDialog({
  open,
  onOpenChange
}) {
  const { provides: signatureCapability } = useSignatureCapability()
  const { notify, signatureFontsStylesheetUrl } = usePdfEditor()
  const supportsInitials =
    (signatureCapability?.mode ?? SignatureMode.SignatureOnly) ===
    SignatureMode.SignatureAndInitials
  const [tab, setTab] = React.useState("draw")
  const [color, setColor] = React.useState(SIGNATURE_COLORS[0].value)
  const [fontFamily, setFontFamily] = React.useState(
    PDF_EDITOR_SIGNATURE_FONTS[0].family
  )
  const [signature, setSignature] =
    React.useState(null)
  const [initials, setInitials] =
    React.useState(null)
  const [activeTarget, setActiveTarget] =
    React.useState("signature")
  const signatureDrawRef = React.useRef(null)
  const initialsDrawRef = React.useRef(null)
  const signatureTypeRef = React.useRef(null)
  const initialsTypeRef = React.useRef(null)
  useSignatureFontsStylesheet(signatureFontsStylesheetUrl, open)
  const signatureUpload = useSignatureUpload({ onResult: setSignature })
  const initialsUpload = useSignatureUpload({ onResult: setInitials })
  const clearSignatureUpload = signatureUpload.clear
  const clearInitialsUpload = initialsUpload.clear
  const clearAll = React.useCallback(() => {
    signatureDrawRef.current?.clear()
    initialsDrawRef.current?.clear()
    signatureTypeRef.current?.clear()
    initialsTypeRef.current?.clear()
    clearSignatureUpload()
    clearInitialsUpload()
    setSignature(null)
    setInitials(null)
  }, [clearInitialsUpload, clearSignatureUpload])
  const [previousOpen, setPreviousOpen] = React.useState(open)
  if (previousOpen !== open) {
    setPreviousOpen(open)
    if (!open) {
      setTab("draw")
      setColor(SIGNATURE_COLORS[0].value)
      setFontFamily(PDF_EDITOR_SIGNATURE_FONTS[0].family)
      setActiveTarget("signature")
      setSignature(null)
      setInitials(null)
    }
  }
  const handleTabChange = (nextTab) => {
    clearAll()
    setTab(nextTab)
  }
  const canSave = Boolean(signature || initials)
  const handleSave = () => {
    const entrySignature = signature ?? initials
    if (!entrySignature || !signatureCapability) return
    signatureCapability.addEntry({
      signature: entrySignature,
      ...(initials ? { initials } : {}),
    })
    notify(signature ? "Signature saved." : "Initials saved.", "success")
    onOpenChange(false)
  }
  const tabs = [
    { id: "draw", label: "Draw" },
    { id: "type", label: "Type" },
    { id: "upload", label: "Upload" },
  ]
  const fontOptions = PDF_EDITOR_SIGNATURE_FONTS.map((font) => ({
    label: font.name,
    value: font.family,
  }))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create signature</DialogTitle>
          <DialogDescription>
            Saved signatures can be placed anywhere in the document.
          </DialogDescription>
        </DialogHeader>
        <InlineDialogPanel className="space-y-4">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === item.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              {supportsInitials ? (
                <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
                  {(["signature", "initials"]).map((target) => (
                    <button
                      key={target}
                      type="button"
                      aria-pressed={activeTarget === target}
                      onClick={() => setActiveTarget(target)}
                      className={cn(
                        "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                        activeTarget === target
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {target === "signature" ? "Signature" : "Initials"}
                    </button>
                  ))}
                </div>
              ) : (
                <PdfEditorFieldLabel>Signature</PdfEditorFieldLabel>
              )}
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  if (activeTarget === "signature") {
                    if (tab === "draw") signatureDrawRef.current?.clear()
                    else if (tab === "type") signatureTypeRef.current?.clear()
                    else clearSignatureUpload()
                    setSignature(null)
                  } else {
                    if (tab === "draw") initialsDrawRef.current?.clear()
                    else if (tab === "type") initialsTypeRef.current?.clear()
                    else clearInitialsUpload()
                    setInitials(null)
                  }
                }}
              >
                Clear
              </Button>
            </div>
            <div
              className={cn(
                "h-36 w-full",
                activeTarget !== "signature" && "hidden"
              )}
            >
              <SignaturePad
                tab={tab}
                color={color}
                fontFamily={fontFamily}
                placeholder="Type your name"
                uploadPlaceholder="Click or drop an image of your signature"
                drawRef={signatureDrawRef}
                typeRef={signatureTypeRef}
                upload={signatureUpload}
                onResult={setSignature}
              />
            </div>
            {supportsInitials ? (
              <div
                className={cn(
                  "w-full",
                  activeTarget !== "initials" && "hidden"
                )}
              >
                <div className="aspect-[20/7] h-36 max-w-full">
                  <SignaturePad
                    tab={tab}
                    color={color}
                    fontFamily={fontFamily}
                    placeholder="Initials"
                    uploadPlaceholder="Click or drop an image"
                    drawRef={initialsDrawRef}
                    typeRef={initialsTypeRef}
                    upload={initialsUpload}
                    onResult={setInitials}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {tab !== "upload" ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Color</span>
                <div className="flex items-center gap-1.5">
                  {SIGNATURE_COLORS.map((option) => (
                    <PdfEditorSwatch
                      key={option.value}
                      color={option.value}
                      label={option.name}
                      active={color === option.value}
                      onClick={() => setColor(option.value)}
                    />
                  ))}
                  <ColorPicker
                    label="Custom signature color"
                    rainbowTrigger
                    color={color}
                    onChange={setColor}
                  />
                </div>
              </div>
            ) : null}
            {tab === "type" ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Font</span>
                <Select
                  value={fontFamily}
                  onValueChange={(value) => setFontFamily(String(value))}
                >
                  <SelectTrigger size="sm" className="w-40">
                    <SelectValue placeholder="Font" />
                  </SelectTrigger>
                  <SelectContent position={false ? "item-aligned" : "popper"}>
                    {fontOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span style={{ fontFamily: option.value }}>
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        </InlineDialogPanel>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={!canSave} onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function readLinkTarget(target) {
  if (!target) return { tab: "url", url: "", pageNumber: null }
  if (target.type === "action") {
    if (target.action.type === PdfActionType.URI) {
      return { tab: "url", url: target.action.uri, pageNumber: null }
    }
    if (
      target.action.type === PdfActionType.Goto ||
      target.action.type === PdfActionType.RemoteGoto
    ) {
      return {
        tab: "page",
        url: "",
        pageNumber: target.action.destination.pageIndex + 1,
      }
    }
    return { tab: "url", url: "", pageNumber: null }
  }
  return {
    tab: "page",
    url: "",
    pageNumber: target.destination.pageIndex + 1,
  }
}
export function PdfEditorLinkDialog({
  documentId,
  open,
  onOpenChange,
  source
}) {
  const { provides: annotationCapability } = useAnnotationCapability()
  const { provides: selectionCapability } = useSelectionCapability()
  const { state: scrollState } = useScroll(documentId)
  const { notify } = usePdfEditor()
  const [tab, setTab] = React.useState("url")
  const [url, setUrl] = React.useState("")
  const [pageNumber, setPageNumber] = React.useState(1)
  const totalPages = Math.max(scrollState.totalPages, 1)
  const annotationScope = React.useMemo(
    () => annotationCapability?.forDocument(documentId) ?? null,
    [annotationCapability, documentId]
  )
  const selectionScope = React.useMemo(
    () => selectionCapability?.forDocument(documentId) ?? null,
    [documentId, selectionCapability]
  )
  const [linkRequest, setLinkRequest] = React.useState({
    annotationScope,
    open: false,
    source,
  })
  if (
    linkRequest.annotationScope !== annotationScope ||
    linkRequest.open !== open ||
    linkRequest.source !== source
  ) {
    setLinkRequest({ annotationScope, open, source })
    if (open) {
      const selected =
        source === "annotation"
          ? annotationScope?.getSelectedAnnotation()
          : null
      const existing =
        selected?.object.type === PdfAnnotationSubtype.LINK
          ? readLinkTarget((selected.object).target)
          : { tab: "url", url: "", pageNumber: 1 }
      setTab(existing.tab)
      setUrl(existing.url)
      setPageNumber(existing.pageNumber ?? 1)
    }
  }
  const buildTarget = () => {
    if (tab === "url") {
      const trimmed = url.trim()
      if (!trimmed) return null
      const normalized = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`
      return {
        type: "action",
        action: { type: PdfActionType.URI, uri: normalized },
      }
    }
    return {
      type: "destination",
      destination: {
        pageIndex: Math.min(Math.max(pageNumber, 1), totalPages) - 1,
        zoom: { mode: PdfZoomMode.FitPage },
        view: [],
      },
    }
  }
  const handleSubmit = () => {
    const target = buildTarget()
    if (!target || !annotationScope) return
    const selected =
      source === "annotation" ? annotationScope.getSelectedAnnotation() : null
    if (selected && selected.object.type === PdfAnnotationSubtype.LINK) {
      annotationScope.updateAnnotation(
        selected.object.pageIndex,
        selected.object.id,
        {
          target
        }
      )
      notify("Link updated.", "success")
      onOpenChange(false)
      return
    }
    if (selected) {
      const rects =
        "segmentRects" in selected.object &&
        Array.isArray(selected.object.segmentRects) &&
        selected.object.segmentRects.length > 0
          ? selected.object.segmentRects
          : [selected.object.rect]
      for (const rect of rects) {
        annotationScope.createAnnotation(selected.object.pageIndex, {
          id: uuidV4(),
          type: PdfAnnotationSubtype.LINK,
          pageIndex: selected.object.pageIndex,
          rect,
          inReplyToId: selected.object.id,
          replyType: PdfAnnotationReplyType.Group,
          target,
          strokeStyle: PdfAnnotationBorderStyle.UNDERLINE,
          strokeColor: "#2563eb",
          strokeWidth: 2,
          created: new Date(),
        })
      }
      notify("Link added.", "success")
      onOpenChange(false)
      return
    }
    const formattedSelection = selectionScope?.getFormattedSelection() ?? []
    if (formattedSelection.length === 0) {
      notify("Select text or an annotation first.", "error")
      return
    }
    const applyLinks = (text) => {
      for (const page of formattedSelection) {
        const highlightId = uuidV4()
        annotationScope.createAnnotation(page.pageIndex, {
          id: highlightId,
          created: new Date(),
          flags: ["print"],
          type: PdfAnnotationSubtype.HIGHLIGHT,
          blendMode: PdfBlendMode.Multiply,
          pageIndex: page.pageIndex,
          rect: page.rect,
          segmentRects: page.segmentRects,
          strokeColor: "#ffffff",
          opacity: 0,
          custom: { text: text.join("\n") },
        })
        for (const rect of page.segmentRects) {
          annotationScope.createAnnotation(page.pageIndex, {
            id: uuidV4(),
            type: PdfAnnotationSubtype.LINK,
            pageIndex: page.pageIndex,
            rect,
            inReplyToId: highlightId,
            replyType: PdfAnnotationReplyType.Group,
            target,
            strokeStyle: PdfAnnotationBorderStyle.UNDERLINE,
            strokeColor: "#2563eb",
            strokeWidth: 2,
            created: new Date(),
          })
        }
      }
      selectionScope?.clear()
      notify("Link added.", "success")
      onOpenChange(false)
    }
    const textTask = selectionScope?.getSelectedText()
    if (textTask) {
      textTask.wait(applyLinks, () => applyLinks([]))
    } else {
      applyLinks([])
    }
  }
  const canSubmit = tab === "url" ? url.trim().length > 0 : pageNumber >= 1
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add link</DialogTitle>
          <DialogDescription>
            {source === "selection"
              ? "The selected text becomes a clickable link."
              : "The selected annotation becomes a clickable link."}
          </DialogDescription>
        </DialogHeader>
        <InlineDialogPanel className="space-y-4">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
            {(
              [["url", "Web address"], ["page", "Page in document"]]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "url" ? (
            <div className="grid gap-1">
              <PdfEditorFieldLabel htmlFor="pdf-editor-link-url">
                URL
              </PdfEditorFieldLabel>
              <Input
                id="pdf-editor-link-url"
                autoFocus
                placeholder="https://example.com"
                value={url}
                onChange={(event) =>
                  setUrl(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canSubmit) handleSubmit()
                }}
              />
            </div>
          ) : (
            <div className="grid gap-1">
              <PdfEditorFieldLabel htmlFor="pdf-editor-link-page">
                Page number (1–{totalPages})
              </PdfEditorFieldLabel>
              <Input
                id="pdf-editor-link-page"
                type="number"
                min={1}
                max={totalPages}
                value={pageNumber}
                onChange={(event) =>
                  setPageNumber(Number(event.target.value) || 1)
                }
              />
            </div>
          )}
        </InlineDialogPanel>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
            Save link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
/* -------------------------------------------------------------------------- */
/* Keyboard shortcuts                                                         */
/* -------------------------------------------------------------------------- */
export const PDF_EDITOR_SHORTCUTS = [
  {
    group: "Document",
    items: [
      { keys: ["mod+S"], label: "Download" },
      { keys: ["mod+P"], label: "Print" },
      { keys: ["mod+F"], label: "Search" },
      { keys: ["mod+Z"], label: "Undo" },
      { keys: ["mod+shift+Z"], label: "Redo" },
    ],
  },
  {
    group: "View",
    items: [
      { keys: ["mod+="], label: "Zoom in" },
      { keys: ["mod+-"], label: "Zoom out" },
      { keys: ["mod+0"], label: "Fit page" },
      { keys: ["H"], label: "Hand tool" },
      { keys: ["V"], label: "Select tool" },
    ],
  },
  {
    group: "Editing",
    items: [
      { keys: ["Esc"], label: "Cancel tool / clear selection" },
      { keys: ["Delete"], label: "Delete selected annotations" },
      { keys: ["mod+A"], label: "Select all annotations on the page" },
    ],
  },
]
export function PdfEditorShortcutsDialog({
  open,
  onOpenChange
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <InlineDialogPanel className="space-y-4">
          {PDF_EDITOR_SHORTCUTS.map((group) => (
            <PdfEditorSection key={group.group} title={group.group}>
              <div className="divide-y rounded-lg border">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm"
                  >
                    <span>{item.label}</span>
                    <span className="flex items-center gap-1">
                      {item.keys.map((key) => (
                        <Kbd key={key}>{formatShortcut(key)}</Kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </PdfEditorSection>
          ))}
        </InlineDialogPanel>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
/* -------------------------------------------------------------------------- */
/* Password prompt (inline)                                                   */
/* -------------------------------------------------------------------------- */
export function PdfEditorPasswordPrompt({
  documentState
}) {
  const { provides: documentManager } = useDocumentManagerCapability()
  const [password, setPassword] = React.useState("")
  const [isRetrying, setIsRetrying] = React.useState(false)
  const isPasswordError = documentState.errorCode === PdfErrorCode.Password
  const isIncorrect = isPasswordError && documentState.passwordProvided
  const handleRetry = () => {
    if (!documentManager || !password.trim()) return
    setIsRetrying(true)
    documentManager.retryDocument(documentState.id, { password }).wait(
      () => {
        setPassword("")
        setIsRetrying(false)
      },
      () => setIsRetrying(false)
    )
  }
  if (!isPasswordError) {
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="max-w-sm space-y-2 text-center">
          <div className="text-sm font-medium text-foreground">
            The document could not be opened
          </div>
          <div className="text-sm text-muted-foreground">
            {documentState.error ?? "An unknown error occurred."}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="w-full max-w-sm space-y-4 rounded-xl border bg-background p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            <LockGlyph className="size-4" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">
              Password required
            </div>
            <div className="text-xs text-muted-foreground">
              {isIncorrect
                ? "The password was incorrect. Try again."
                : "This document is protected. Enter the password to open it."}
            </div>
          </div>
        </div>
        <PasswordInput
          value={password}
          autoFocus
          placeholder="Document password"
          onChange={setPassword}
          onEnter={handleRetry}
        />
        <div className="flex justify-end">
          <InlineLoadingButton
            type="button"
            loading={isRetrying}
            disabled={!password.trim()}
            onClick={handleRetry}
          >
            Open document
          </InlineLoadingButton>
        </div>
      </div>
    </div>
  )
}
export { ignore as ignorePdfTask }
function InlineDialogPanel({
  className,
  children,
  ...props
}) {
  return (
    <ScrollArea className="min-h-0">
      <div
        data-slot="dialog-panel"
        className={cn("min-h-0", className)}
        {...props}
      >
        {children}
      </div>
    </ScrollArea>
  )
}
function InlineLoadingButton({
  loading,
  disabled,
  children,
  className,
  ...props
}) {
  return (
    <Button
      {...props}
      className={cn("relative", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      <span className={cn("contents", loading && "invisible")}>{children}</span>
      {loading ? (
        <InlineSpinner className="pointer-events-none absolute" />
      ) : null}
    </Button>
  )
}
function InlineSpinner({
  className,
  ...props
}) {
  return (
    <IconPlaceholder
      lucide="LoaderCircle"
      tabler="IconLoader2"
      hugeicons="Loading03Icon"
      phosphor="CircleNotchIcon"
      remixicon="RiLoader4Line"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}
