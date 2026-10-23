"use client";
import * as React from "react"
import { PdfAnnotationSubtype } from "@embedpdf/models"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import {
  ScrollArea as InlineScrollArea,
  ScrollBar,
} from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { IconPlaceholder } from "@/components/icon-placeholder"

export const PDF_EDITOR_DEFAULT_FEATURES = {
  annotate: true,
  redact: true,
  forms: true,
  sign: true,
  stamps: true,
  pages: true,
  security: true,
  print: true,
  capture: true,
  outline: true,
  attachments: true,
  comments: true,
  fullscreen: true,
};
const PdfEditorContext = React.createContext(null)
export const PdfEditorContextProvider = PdfEditorContext.Provider
export function usePdfEditor() {
  const context = React.useContext(PdfEditorContext)
  if (!context) {
    throw new Error("usePdfEditor must be used inside a PDFEditor.")
  }
  return context
}
/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */
export const PDF_EDITOR_DEFAULT_COLOR_PRESETS = [
  "#111827",
  "#e11d48",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#0ea5e9",
  "#2563eb",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
  "#ffffff",
]
export const PDF_EDITOR_SELECTION_COLOR = "#2563eb"
export const PDF_EDITOR_DEFAULT_STAMP_MANIFEST_URL =
  "https://cdn.jsdelivr.net/npm/@embedpdf/default-stamps/{locale}/manifest.json"
export const PDF_EDITOR_DEFAULT_SIGNATURE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Caveat&family=Dancing+Script&family=Great+Vibes&family=Pacifico&display=swap"
export const PDF_EDITOR_SIGNATURE_FONTS = [
  { name: "Dancing Script", family: "'Dancing Script', cursive" },
  { name: "Great Vibes", family: "'Great Vibes', cursive" },
  { name: "Pacifico", family: "'Pacifico', cursive" },
  { name: "Caveat", family: "'Caveat', cursive" },
]
export function PanelLeftGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="PanelLeft"
      tabler="IconLayoutSidebar"
      hugeicons="SidebarLeftIcon"
      phosphor="SidebarIcon"
      remixicon="RiLayoutLeftLine"
      className={className}
      style={style}
    />
  )
}
export function PanelRightGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="PanelRight"
      tabler="IconLayoutSidebarRight"
      hugeicons="SidebarRightIcon"
      phosphor="SidebarSimpleIcon"
      remixicon="RiLayoutRightLine"
      className={className}
      style={style}
    />
  )
}
export function UndoGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Undo2"
      tabler="IconArrowBackUp"
      hugeicons="Undo02Icon"
      phosphor="ArrowUUpLeftIcon"
      remixicon="RiArrowGoBackLine"
      className={className}
      style={style}
    />
  )
}
export function RedoGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Redo2"
      tabler="IconArrowForwardUp"
      hugeicons="Redo02Icon"
      phosphor="ArrowUUpRightIcon"
      remixicon="RiArrowGoForwardLine"
      className={className}
      style={style}
    />
  )
}
export function ZoomOutGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="CircleMinus"
      tabler="IconCircleMinus"
      hugeicons="MinusSignCircleIcon"
      phosphor="MinusCircleIcon"
      remixicon="RiIndeterminateCircleLine"
      className={className}
      style={style}
    />
  )
}
export function ZoomInGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="CirclePlus"
      tabler="IconCirclePlus"
      hugeicons="PlusSignCircleIcon"
      phosphor="PlusCircleIcon"
      remixicon="RiAddCircleLine"
      className={className}
      style={style}
    />
  )
}
export function RotateGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="RotateCw"
      tabler="IconRotateClockwise"
      hugeicons="RotateClockwiseIcon"
      phosphor="ArrowClockwiseIcon"
      remixicon="RiClockwiseLine"
      className={className}
      style={style}
    />
  )
}
export function SearchGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Search"
      tabler="IconSearch"
      hugeicons="Search01Icon"
      phosphor="MagnifyingGlassIcon"
      remixicon="RiSearchLine"
      className={className}
      style={style}
    />
  )
}
export function MoreGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Ellipsis"
      tabler="IconDots"
      hugeicons="MoreHorizontalIcon"
      phosphor="DotsThreeIcon"
      remixicon="RiMoreLine"
      className={className}
      style={style}
    />
  )
}
export function DownloadGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Download"
      tabler="IconDownload"
      hugeicons="Download01Icon"
      phosphor="DownloadSimpleIcon"
      remixicon="RiDownload2Line"
      className={className}
      style={style}
    />
  )
}
export function UploadGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Upload"
      tabler="IconUpload"
      hugeicons="Upload01Icon"
      phosphor="UploadSimpleIcon"
      remixicon="RiUpload2Line"
      className={className}
      style={style}
    />
  )
}
export function PrintGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Printer"
      tabler="IconPrinter"
      hugeicons="PrinterIcon"
      phosphor="PrinterIcon"
      remixicon="RiPrinterLine"
      className={className}
      style={style}
    />
  )
}
export function FullscreenGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Maximize"
      tabler="IconMaximize"
      hugeicons="FullScreenIcon"
      phosphor="CornersOutIcon"
      remixicon="RiFullscreenLine"
      className={className}
      style={style}
    />
  )
}
export function ExitFullscreenGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Minimize"
      tabler="IconMinimize"
      hugeicons="MinimizeScreenIcon"
      phosphor="CornersInIcon"
      remixicon="RiFullscreenExitLine"
      className={className}
      style={style}
    />
  )
}
export function HandGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Hand"
      tabler="IconHandStop"
      hugeicons="HandIcon"
      phosphor="HandIcon"
      remixicon="RiHand"
      className={className}
      style={style}
    />
  )
}
export function CursorGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="MousePointer2"
      tabler="IconPointer"
      hugeicons="Cursor01Icon"
      phosphor="CursorIcon"
      remixicon="RiCursorLine"
      className={className}
      style={style}
    />
  )
}
export function CameraGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Camera"
      tabler="IconCamera"
      hugeicons="Camera01Icon"
      phosphor="CameraIcon"
      remixicon="RiScreenshotLine"
      className={className}
      style={style}
    />
  )
}
export function MarqueeZoomGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="ScanSearch"
      tabler="IconZoomInArea"
      hugeicons="ZoomInAreaIcon"
      phosphor="MagnifyingGlassPlusIcon"
      remixicon="RiZoomInLine"
      className={className}
      style={style}
    />
  )
}
export function BookOpenGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="BookOpen"
      tabler="IconBook"
      hugeicons="Book01Icon"
      phosphor="BookOpenIcon"
      remixicon="RiBookOpenLine"
      className={className}
      style={style}
    />
  )
}
export function FileGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="File"
      tabler="IconFile"
      hugeicons="File01Icon"
      phosphor="FileIcon"
      remixicon="RiFileLine"
      className={className}
      style={style}
    />
  )
}
export function ArrowsHorizontalGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="MoveHorizontal"
      tabler="IconArrowsHorizontal"
      hugeicons="ArrowLeftRightIcon"
      phosphor="ArrowsHorizontalIcon"
      remixicon="RiArrowLeftRightLine"
      className={className}
      style={style}
    />
  )
}
export function ArrowsVerticalGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="MoveVertical"
      tabler="IconArrowsVertical"
      hugeicons="ArrowUpDownIcon"
      phosphor="ArrowsVerticalIcon"
      remixicon="RiArrowUpDownLine"
      className={className}
      style={style}
    />
  )
}
export function HighlighterGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Highlighter"
      tabler="IconHighlight"
      hugeicons="HighlighterIcon"
      phosphor="HighlighterIcon"
      remixicon="RiMarkPenLine"
      className={className}
      style={style}
    />
  )
}
export function UnderlineGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Underline"
      tabler="IconUnderline"
      hugeicons="TextUnderlineIcon"
      phosphor="TextUnderlineIcon"
      remixicon="RiUnderline"
      className={className}
      style={style}
    />
  )
}
export function StrikethroughGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Strikethrough"
      tabler="IconStrikethrough"
      hugeicons="TextStrikethroughIcon"
      phosphor="TextStrikethroughIcon"
      remixicon="RiStrikethrough"
      className={className}
      style={style}
    />
  )
}
export function SquigglyGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="LineSquiggle"
      tabler="IconWaveSine"
      hugeicons="WaveIcon"
      phosphor="WaveSineIcon"
      remixicon="RiPulseLine"
      className={className}
      style={style}
    />
  )
}
export function PenGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Pen"
      tabler="IconPencil"
      hugeicons="Pen01Icon"
      phosphor="PenIcon"
      remixicon="RiPencilLine"
      className={className}
      style={style}
    />
  )
}
export function BrushGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Brush"
      tabler="IconBrush"
      hugeicons="BrushIcon"
      phosphor="PaintBrushIcon"
      remixicon="RiBrushLine"
      className={className}
      style={style}
    />
  )
}
export function TextGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Type"
      tabler="IconTypography"
      hugeicons="TextIcon"
      phosphor="TextTIcon"
      remixicon="RiText"
      className={className}
      style={style}
    />
  )
}
export function TextFontGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Type"
      tabler="IconTypography"
      hugeicons="TextFontIcon"
      phosphor="TextAaIcon"
      remixicon="RiFontSize"
      className={className}
      style={style}
    />
  )
}
export function CalloutGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="MessageSquareText"
      tabler="IconMessage2"
      hugeicons="BubbleChatIcon"
      phosphor="ChatTextIcon"
      remixicon="RiChat3Line"
      className={className}
      style={style}
    />
  )
}
export function StickyNoteGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="StickyNote"
      tabler="IconNote"
      hugeicons="StickyNote01Icon"
      phosphor="NoteIcon"
      remixicon="RiStickyNoteLine"
      className={className}
      style={style}
    />
  )
}
export function SquareGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Square"
      tabler="IconSquare"
      hugeicons="SquareIcon"
      phosphor="SquareIcon"
      remixicon="RiCheckboxBlankLine"
      className={className}
      style={style}
    />
  )
}
export function CircleGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Circle"
      tabler="IconCircle"
      hugeicons="CircleIcon"
      phosphor="CircleIcon"
      remixicon="RiCircleLine"
      className={className}
      style={style}
    />
  )
}
export function LineGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Minus"
      tabler="IconLine"
      hugeicons="MinusSignIcon"
      phosphor="LineSegmentIcon"
      remixicon="RiSubtractLine"
      className={className}
      style={style}
    />
  )
}
export function ArrowGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="MoveUpRight"
      tabler="IconArrowUpRight"
      hugeicons="ArrowUpRight01Icon"
      phosphor="ArrowUpRightIcon"
      remixicon="RiArrowRightUpLine"
      className={className}
      style={style}
    />
  )
}
export function PolylineGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Spline"
      tabler="IconVectorSpline"
      hugeicons="SplinePointerIcon"
      phosphor="VectorTwoIcon"
      remixicon="RiRouteLine"
      className={className}
      style={style}
    />
  )
}
export function PolygonGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Pentagon"
      tabler="IconPolygon"
      hugeicons="PolygonIcon"
      phosphor="PolygonIcon"
      remixicon="RiPentagonLine"
      className={className}
      style={style}
    />
  )
}
export function ImageGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Image"
      tabler="IconPhoto"
      hugeicons="Image01Icon"
      phosphor="ImageIcon"
      remixicon="RiImageLine"
      className={className}
      style={style}
    />
  )
}
export function StampGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Stamp"
      tabler="IconRubberStamp"
      hugeicons="StampIcon"
      phosphor="StampIcon"
      remixicon="RiVerifiedBadgeLine"
      className={className}
      style={style}
    />
  )
}
export function LinkGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Link"
      tabler="IconLink"
      hugeicons="Link02Icon"
      phosphor="LinkIcon"
      remixicon="RiLink"
      className={className}
      style={style}
    />
  )
}
export function InsertTextGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="TextCursorInput"
      tabler="IconCursorText"
      hugeicons="CursorTextIcon"
      phosphor="CursorTextIcon"
      remixicon="RiInputCursorMove"
      className={className}
      style={style}
    />
  )
}
export function ReplaceTextGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Replace"
      tabler="IconReplace"
      hugeicons="ReplaceIcon"
      phosphor="ArrowsLeftRightIcon"
      remixicon="RiFindReplaceLine"
      className={className}
      style={style}
    />
  )
}
export function TrashGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Trash2"
      tabler="IconTrash"
      hugeicons="Delete02Icon"
      phosphor="TrashIcon"
      remixicon="RiDeleteBinLine"
      className={className}
      style={style}
    />
  )
}
export function GroupGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Group"
      tabler="IconLayersUnion"
      hugeicons="GroupItemsIcon"
      phosphor="StackIcon"
      remixicon="RiStackLine"
      className={className}
      style={style}
    />
  )
}
export function UngroupGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Ungroup"
      tabler="IconLayersSubtract"
      hugeicons="UngroupItemsIcon"
      phosphor="StackSimpleIcon"
      remixicon="RiStackLine"
      className={className}
      style={style}
    />
  )
}
export function LockGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Lock"
      tabler="IconLock"
      hugeicons="SquareLock02Icon"
      phosphor="LockIcon"
      remixicon="RiLockLine"
      className={className}
      style={style}
    />
  )
}
export function UnlockGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="LockOpen"
      tabler="IconLockOpen"
      hugeicons="SquareUnlock02Icon"
      phosphor="LockOpenIcon"
      remixicon="RiLockUnlockLine"
      className={className}
      style={style}
    />
  )
}
export function CommentGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="MessageCircle"
      tabler="IconMessageCircle"
      hugeicons="Comment01Icon"
      phosphor="ChatCircleIcon"
      remixicon="RiChat1Line"
      className={className}
      style={style}
    />
  )
}
export function CommentsGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="MessagesSquare"
      tabler="IconMessages"
      hugeicons="CommentAdd01Icon"
      phosphor="ChatsIcon"
      remixicon="RiChat3Line"
      className={className}
      style={style}
    />
  )
}
export function CheckGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Check"
      tabler="IconCheck"
      hugeicons="Tick02Icon"
      phosphor="CheckIcon"
      remixicon="RiCheckLine"
      className={className}
      style={style}
    />
  )
}
export function CloseGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="X"
      tabler="IconX"
      hugeicons="Cancel01Icon"
      phosphor="XIcon"
      remixicon="RiCloseLine"
      className={className}
      style={style}
    />
  )
}
export function PlusGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Plus"
      tabler="IconPlus"
      hugeicons="Add01Icon"
      phosphor="PlusIcon"
      remixicon="RiAddLine"
      className={className}
      style={style}
    />
  )
}
export function MinusGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Minus"
      tabler="IconMinus"
      hugeicons="MinusSignIcon"
      phosphor="MinusIcon"
      remixicon="RiSubtractLine"
      className={className}
      style={style}
    />
  )
}
export function CopyGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Copy"
      tabler="IconCopy"
      hugeicons="Copy01Icon"
      phosphor="CopyIcon"
      remixicon="RiFileCopyLine"
      className={className}
      style={style}
    />
  )
}
export function EyeOffGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="EyeOff"
      tabler="IconEyeOff"
      hugeicons="ViewOffIcon"
      phosphor="EyeSlashIcon"
      remixicon="RiEyeOffLine"
      className={className}
      style={style}
    />
  )
}
export function EyeGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Eye"
      tabler="IconEye"
      hugeicons="ViewIcon"
      phosphor="EyeIcon"
      remixicon="RiEyeLine"
      className={className}
      style={style}
    />
  )
}
export function RedactAreaGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="SquareDashed"
      tabler="IconSquareDashed"
      hugeicons="CursorRectangleSelection01Icon"
      phosphor="SelectionIcon"
      remixicon="RiCropLine"
      className={className}
      style={style}
    />
  )
}
export function SignatureGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Signature"
      tabler="IconSignature"
      hugeicons="SignatureIcon"
      phosphor="SignatureIcon"
      remixicon="RiQuillPenLine"
      className={className}
      style={style}
    />
  )
}
export function TextFieldGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="RectangleEllipsis"
      tabler="IconForms"
      hugeicons="InputTextIcon"
      phosphor="TextboxIcon"
      remixicon="RiInputField"
      className={className}
      style={style}
    />
  )
}
export function CheckboxGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="SquareCheck"
      tabler="IconSquareCheck"
      hugeicons="CheckmarkSquare01Icon"
      phosphor="CheckSquareIcon"
      remixicon="RiCheckboxLine"
      className={className}
      style={style}
    />
  )
}
export function RadioGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="CircleDot"
      tabler="IconCircleDot"
      hugeicons="RadioButtonIcon"
      phosphor="RadioButtonIcon"
      remixicon="RiRadioButtonLine"
      className={className}
      style={style}
    />
  )
}
export function ComboboxGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="ChevronsUpDown"
      tabler="IconSelect"
      hugeicons="UnfoldMoreIcon"
      phosphor="CaretUpDownIcon"
      remixicon="RiArrowUpDownLine"
      className={className}
      style={style}
    />
  )
}
export function ListboxGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="List"
      tabler="IconList"
      hugeicons="LeftToRightListBulletIcon"
      phosphor="ListIcon"
      remixicon="RiListUnordered"
      className={className}
      style={style}
    />
  )
}
export function ListTreeGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="ListTree"
      tabler="IconListTree"
      hugeicons="ListTreeIcon"
      phosphor="TreeStructureIcon"
      remixicon="RiNodeTree"
      className={className}
      style={style}
    />
  )
}
export function PaperclipGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Paperclip"
      tabler="IconPaperclip"
      hugeicons="Attachment01Icon"
      phosphor="PaperclipIcon"
      remixicon="RiAttachment2"
      className={className}
      style={style}
    />
  )
}
export function GridGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="LayoutGrid"
      tabler="IconLayoutGrid"
      hugeicons="GridViewIcon"
      phosphor="SquaresFourIcon"
      remixicon="RiLayoutGridLine"
      className={className}
      style={style}
    />
  )
}
export function SlidersGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="SlidersHorizontal"
      tabler="IconAdjustmentsHorizontal"
      hugeicons="SlidersHorizontalIcon"
      phosphor="SlidersHorizontalIcon"
      remixicon="RiEqualizerLine"
      className={className}
      style={style}
    />
  )
}
export function InfoGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Info"
      tabler="IconInfoCircle"
      hugeicons="InformationCircleIcon"
      phosphor="InfoIcon"
      remixicon="RiInformationLine"
      className={className}
      style={style}
    />
  )
}
export function ShieldGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="ShieldCheck"
      tabler="IconShieldLock"
      hugeicons="Shield01Icon"
      phosphor="ShieldCheckIcon"
      remixicon="RiShieldKeyholeLine"
      className={className}
      style={style}
    />
  )
}
export function FileTextGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="FileText"
      tabler="IconFileText"
      hugeicons="File01Icon"
      phosphor="FileTextIcon"
      remixicon="RiFileTextLine"
      className={className}
      style={style}
    />
  )
}
export function ChevronDownGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="ChevronDown"
      tabler="IconChevronDown"
      hugeicons="ArrowDown01Icon"
      phosphor="CaretDownIcon"
      remixicon="RiArrowDownSLine"
      className={className}
      style={style}
    />
  )
}
export function ChevronUpGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="ChevronUp"
      tabler="IconChevronUp"
      hugeicons="ArrowUp01Icon"
      phosphor="CaretUpIcon"
      remixicon="RiArrowUpSLine"
      className={className}
      style={style}
    />
  )
}
export function ChevronLeftGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="ChevronLeft"
      tabler="IconChevronLeft"
      hugeicons="ArrowLeft01Icon"
      phosphor="CaretLeftIcon"
      remixicon="RiArrowLeftSLine"
      className={className}
      style={style}
    />
  )
}
export function ChevronRightGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="ChevronRight"
      tabler="IconChevronRight"
      hugeicons="ArrowRight01Icon"
      phosphor="CaretRightIcon"
      remixicon="RiArrowRightSLine"
      className={className}
      style={style}
    />
  )
}
export function LayersGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Layers"
      tabler="IconStack2"
      hugeicons="Layers01Icon"
      phosphor="StackIcon"
      remixicon="RiStackLine"
      className={className}
      style={style}
    />
  )
}
export function FilePlusGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="FilePlus"
      tabler="IconFilePlus"
      hugeicons="FileAddIcon"
      phosphor="FilePlusIcon"
      remixicon="RiFileAddLine"
      className={className}
      style={style}
    />
  )
}
export function ScissorsGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Scissors"
      tabler="IconScissors"
      hugeicons="Scissor01Icon"
      phosphor="ScissorsIcon"
      remixicon="RiScissorsLine"
      className={className}
      style={style}
    />
  )
}
export function MergeGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Merge"
      tabler="IconArrowMerge"
      hugeicons="GitMergeIcon"
      phosphor="GitMergeIcon"
      remixicon="RiGitMergeLine"
      className={className}
      style={style}
    />
  )
}
export function RefreshGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="RefreshCw"
      tabler="IconRefresh"
      hugeicons="RefreshIcon"
      phosphor="ArrowsClockwiseIcon"
      remixicon="RiRefreshLine"
      className={className}
      style={style}
    />
  )
}
export function SaveGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Save"
      tabler="IconDeviceFloppy"
      hugeicons="FloppyDiskIcon"
      phosphor="FloppyDiskIcon"
      remixicon="RiSaveLine"
      className={className}
      style={style}
    />
  )
}
export function KeyboardGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Keyboard"
      tabler="IconKeyboard"
      hugeicons="KeyboardIcon"
      phosphor="KeyboardIcon"
      remixicon="RiKeyboardLine"
      className={className}
      style={style}
    />
  )
}
export function PaletteGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Palette"
      tabler="IconPalette"
      hugeicons="PaintBoardIcon"
      phosphor="PaletteIcon"
      remixicon="RiPaletteLine"
      className={className}
      style={style}
    />
  )
}
export function BoldGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Bold"
      tabler="IconBold"
      hugeicons="TextBoldIcon"
      phosphor="TextBIcon"
      remixicon="RiBold"
      className={className}
      style={style}
    />
  )
}
export function ItalicGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Italic"
      tabler="IconItalic"
      hugeicons="TextItalicIcon"
      phosphor="TextItalicIcon"
      remixicon="RiItalic"
      className={className}
      style={style}
    />
  )
}
export function AlignLeftGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="TextAlignStart"
      tabler="IconAlignLeft"
      hugeicons="TextAlignLeft01Icon"
      phosphor="TextAlignLeftIcon"
      remixicon="RiAlignLeft"
      className={className}
      style={style}
    />
  )
}
export function AlignCenterGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="TextAlignCenter"
      tabler="IconAlignCenter"
      hugeicons="TextAlignCenterIcon"
      phosphor="TextAlignCenterIcon"
      remixicon="RiAlignCenter"
      className={className}
      style={style}
    />
  )
}
export function AlignRightGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="TextAlignEnd"
      tabler="IconAlignRight"
      hugeicons="TextAlignRight01Icon"
      phosphor="TextAlignRightIcon"
      remixicon="RiAlignRight"
      className={className}
      style={style}
    />
  )
}
export function AlignTopGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="ArrowUpToLine"
      tabler="IconAlignBoxTopCenter"
      hugeicons="AlignBoxTopCenterIcon"
      phosphor="AlignTopIcon"
      remixicon="RiAlignTop"
      className={className}
      style={style}
    />
  )
}
export function AlignMiddleGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="AlignVerticalJustifyCenter"
      tabler="IconAlignBoxCenterMiddle"
      hugeicons="AlignBoxMiddleCenterIcon"
      phosphor="AlignCenterVerticalIcon"
      remixicon="RiAlignVertically"
      className={className}
      style={style}
    />
  )
}
export function AlignBottomGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="ArrowDownToLine"
      tabler="IconAlignBoxBottomCenter"
      hugeicons="AlignBoxBottomCenterIcon"
      phosphor="AlignBottomIcon"
      remixicon="RiAlignBottom"
      className={className}
      style={style}
    />
  )
}
export function FlagGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Flag"
      tabler="IconFlag"
      hugeicons="Flag01Icon"
      phosphor="FlagIcon"
      remixicon="RiFlagLine"
      className={className}
      style={style}
    />
  )
}
export function ClipboardGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Clipboard"
      tabler="IconClipboard"
      hugeicons="ClipboardIcon"
      phosphor="ClipboardIcon"
      remixicon="RiClipboardLine"
      className={className}
      style={style}
    />
  )
}
export function KeyGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Key"
      tabler="IconKey"
      hugeicons="Key01Icon"
      phosphor="KeyIcon"
      remixicon="RiKey2Line"
      className={className}
      style={style}
    />
  )
}
export function ExternalLinkGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="ExternalLink"
      tabler="IconExternalLink"
      hugeicons="ExternalLinkIcon"
      phosphor="ArrowSquareOutIcon"
      remixicon="RiExternalLinkLine"
      className={className}
      style={style}
    />
  )
}
export function MoveGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Move"
      tabler="IconArrowsMove"
      hugeicons="MoveIcon"
      phosphor="ArrowsOutCardinalIcon"
      remixicon="RiDragMove2Line"
      className={className}
      style={style}
    />
  )
}
export function AlertGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="TriangleAlert"
      tabler="IconAlertTriangle"
      hugeicons="Alert01Icon"
      phosphor="WarningIcon"
      remixicon="RiAlertLine"
      className={className}
      style={style}
    />
  )
}
export function ArrowUpGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="ArrowUp"
      tabler="IconArrowUp"
      hugeicons="ArrowUp02Icon"
      phosphor="ArrowUpIcon"
      remixicon="RiArrowUpLine"
      className={className}
      style={style}
    />
  )
}
export function ArrowDownGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="ArrowDown"
      tabler="IconArrowDown"
      hugeicons="ArrowDown02Icon"
      phosphor="ArrowDownIcon"
      remixicon="RiArrowDownLine"
      className={className}
      style={style}
    />
  )
}
export function EditGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Pencil"
      tabler="IconEdit"
      hugeicons="PencilEdit01Icon"
      phosphor="PencilSimpleIcon"
      remixicon="RiEditLine"
      className={className}
      style={style}
    />
  )
}
export function SparklesGlyph({
  className,
  style
}) {
  return (
    <IconPlaceholder
      lucide="Sparkles"
      tabler="IconSparkles"
      hugeicons="SparklesIcon"
      phosphor="SparkleIcon"
      remixicon="RiSparklingLine"
      className={className}
      style={style}
    />
  )
}
export const PDF_EDITOR_ANNOTATION_TOOL_GROUPS = [
  {
    id: "markup",
    label: "Text markup",
    tools: [
      {
        id: "highlight",
        label: "Highlight",
        glyph: HighlighterGlyph,
        hint: "Select text to highlight",
      },
      {
        id: "underline",
        label: "Underline",
        glyph: UnderlineGlyph,
        hint: "Select text to underline",
      },
      {
        id: "strikeout",
        label: "Strikethrough",
        glyph: StrikethroughGlyph,
        hint: "Select text to strike through",
      },
      {
        id: "squiggly",
        label: "Squiggly",
        glyph: SquigglyGlyph,
        hint: "Select text for a squiggly underline",
      },
    ],
  },
  {
    id: "draw",
    label: "Draw",
    tools: [
      {
        id: "ink",
        label: "Pen",
        glyph: PenGlyph,
        hint: "Draw freehand",
      },
      {
        id: "inkHighlighter",
        label: "Highlighter pen",
        glyph: BrushGlyph,
        hint: "Draw a translucent highlighter stroke",
      },
    ],
  },
  {
    id: "text",
    label: "Text",
    tools: [
      {
        id: "freeText",
        label: "Text box",
        glyph: TextGlyph,
        hint: "Click or drag to add text",
      },
      {
        id: "freeTextCallout",
        label: "Callout",
        glyph: CalloutGlyph,
        hint: "Drag to add a callout with a leader line",
      },
      {
        id: "textComment",
        label: "Sticky note",
        glyph: StickyNoteGlyph,
        hint: "Click to add a note",
      },
    ],
  },
  {
    id: "shapes",
    label: "Shapes",
    tools: [
      { id: "square", label: "Rectangle", glyph: SquareGlyph },
      { id: "circle", label: "Ellipse", glyph: CircleGlyph },
      { id: "line", label: "Line", glyph: LineGlyph },
      { id: "lineArrow", label: "Arrow", glyph: ArrowGlyph },
      {
        id: "polyline",
        label: "Polyline",
        glyph: PolylineGlyph,
        hint: "Click to add points, double-click to finish",
      },
      {
        id: "polygon",
        label: "Polygon",
        glyph: PolygonGlyph,
        hint: "Click to add points, double-click to finish",
      },
    ],
  },
  {
    id: "insert",
    label: "Insert",
    tools: [
      {
        id: "stamp",
        label: "Image",
        glyph: ImageGlyph,
        hint: "Click the page to place an image",
      },
      {
        id: "link",
        label: "Link area",
        glyph: LinkGlyph,
        hint: "Drag to add a link rectangle",
      },
      {
        id: "insertText",
        label: "Insert text mark",
        glyph: InsertTextGlyph,
        hint: "Select text to mark an insertion point",
      },
      {
        id: "replaceText",
        label: "Replace text mark",
        glyph: ReplaceTextGlyph,
        hint: "Select text to mark it for replacement",
      },
    ],
  },
]
export const PDF_EDITOR_ANNOTATION_TOOLS =
  PDF_EDITOR_ANNOTATION_TOOL_GROUPS.flatMap((group) => group.tools)
export const PDF_EDITOR_FORM_TOOLS = [
  {
    id: "formTextField",
    label: "Text field",
    glyph: TextFieldGlyph,
    hint: "Click or drag to add a text field",
  },
  {
    id: "formCheckbox",
    label: "Checkbox",
    glyph: CheckboxGlyph,
    hint: "Click to add a checkbox",
  },
  {
    id: "formRadioButton",
    label: "Radio button",
    glyph: RadioGlyph,
    hint: "Click to add a radio button",
  },
  {
    id: "formCombobox",
    label: "Dropdown",
    glyph: ComboboxGlyph,
    hint: "Click or drag to add a dropdown",
  },
  {
    id: "formListbox",
    label: "List box",
    glyph: ListboxGlyph,
    hint: "Click or drag to add a list box",
  },
]
export const PDF_EDITOR_MODE_OPTIONS = [
  { id: "view", label: "View", glyph: EyeGlyph, feature: null },
  { id: "annotate", label: "Annotate", glyph: PenGlyph, feature: "annotate" },
  { id: "sign", label: "Sign", glyph: SignatureGlyph, feature: "sign" },
  { id: "forms", label: "Forms", glyph: TextFieldGlyph, feature: "forms" },
  { id: "redact", label: "Redact", glyph: EyeOffGlyph, feature: "redact" },
]
export function getAnnotationColor(annotation) {
  const record = annotation
  const candidates = [record.strokeColor, record.fontColor, record.color]
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate
  }
  return undefined
}
export function getAnnotationMeta(annotation) {
  const color = getAnnotationColor(annotation)
  const intent = annotation.intent ?? ""
  switch (annotation.type) {
    case PdfAnnotationSubtype.HIGHLIGHT:
      return { label: "Highlight", glyph: HighlighterGlyph, color }
    case PdfAnnotationSubtype.UNDERLINE:
      return { label: "Underline", glyph: UnderlineGlyph, color }
    case PdfAnnotationSubtype.STRIKEOUT:
      return intent === "StrikeOutTextReplace"
        ? { label: "Replace text", glyph: ReplaceTextGlyph, color }
        : { label: "Strikethrough", glyph: StrikethroughGlyph, color }
    case PdfAnnotationSubtype.SQUIGGLY:
      return { label: "Squiggly", glyph: SquigglyGlyph, color }
    case PdfAnnotationSubtype.INK:
      return intent === "InkHighlight"
        ? { label: "Highlighter pen", glyph: BrushGlyph, color }
        : { label: "Ink", glyph: PenGlyph, color }
    case PdfAnnotationSubtype.SQUARE:
      return { label: "Rectangle", glyph: SquareGlyph, color }
    case PdfAnnotationSubtype.CIRCLE:
      return { label: "Ellipse", glyph: CircleGlyph, color }
    case PdfAnnotationSubtype.LINE:
      return intent === "LineArrow"
        ? { label: "Arrow", glyph: ArrowGlyph, color }
        : { label: "Line", glyph: LineGlyph, color }
    case PdfAnnotationSubtype.POLYLINE:
      return { label: "Polyline", glyph: PolylineGlyph, color }
    case PdfAnnotationSubtype.POLYGON:
      return { label: "Polygon", glyph: PolygonGlyph, color }
    case PdfAnnotationSubtype.FREETEXT:
      return intent === "FreeTextCallout"
        ? { label: "Callout", glyph: CalloutGlyph, color }
        : { label: "Text box", glyph: TextGlyph, color }
    case PdfAnnotationSubtype.TEXT:
      return { label: "Note", glyph: StickyNoteGlyph, color }
    case PdfAnnotationSubtype.STAMP:
      return { label: "Stamp", glyph: StampGlyph, color }
    case PdfAnnotationSubtype.LINK:
      return { label: "Link", glyph: LinkGlyph, color }
    case PdfAnnotationSubtype.CARET:
      return { label: "Insert text", glyph: InsertTextGlyph, color }
    case PdfAnnotationSubtype.REDACT:
      return { label: "Redaction", glyph: EyeOffGlyph, color }
    case PdfAnnotationSubtype.WIDGET:
      return { label: "Form field", glyph: TextFieldGlyph, color }
    case PdfAnnotationSubtype.FILEATTACHMENT:
      return { label: "Attachment", glyph: PaperclipGlyph, color }
    default:
      return { label: "Annotation", glyph: FlagGlyph, color }
  }
}
/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}
export function ensurePdfExtension(fileName) {
  return fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`
}
export function getPdfFileName(fileName, src) {
  if (fileName?.trim()) return ensurePdfExtension(fileName.trim())
  if (src && !src.startsWith("blob:") && !src.startsWith("data:")) {
    const pathname = src.split(/[?#]/)[0] ?? ""
    const rawName = pathname.split("/").pop() || ""
    if (rawName) {
      try {
        return ensurePdfExtension(decodeURIComponent(rawName))
      } catch {
        return ensurePdfExtension(rawName)
      }
    }
  }
  return "document.pdf"
}
export function withFileNameSuffix(fileName, suffix) {
  return ensurePdfExtension(fileName.replace(/\.pdf$/i, "") + suffix)
}
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  anchor.rel = "noopener"
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
export function downloadArrayBuffer(
  buffer,
  fileName,
  type = "application/pdf"
) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  downloadBlob(new Blob([copy], { type }), fileName)
}
export function toArrayBuffer(bytes) {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return copy
}
export function readFileAsArrayBuffer(file) {
  return file.arrayBuffer()
}
export function formatBytes(bytes) {
  if (bytes === undefined || Number.isNaN(bytes)) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
export function formatDateTime(date) {
  if (!date) return "—"
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) return "—"
  return value.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}
export function formatRelativeDate(date) {
  if (!date) return ""
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) return ""
  const diff = Date.now() - value.getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}
export function toNormalizedRect(rect, pageSize) {
  const width = pageSize.width || 1
  const height = pageSize.height || 1
  return {
    top: (rect.origin.y / height) * 100,
    left: (rect.origin.x / width) * 100,
    width: (rect.size.width / width) * 100,
    height: (rect.size.height / height) * 100,
  }
}
export function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], [contenteditable='']"
    )
  )
}
export function isMacPlatform() {
  if (typeof navigator === "undefined") return false
  return /mac|iphone|ipad|ipod/i.test(navigator.platform)
}
export function formatShortcut(shortcut) {
  const mac = isMacPlatform()
  return shortcut
    .replace(/mod/gi, mac ? "⌘" : "Ctrl")
    .replace(/shift/gi, mac ? "⇧" : "Shift")
    .replace(/alt/gi, mac ? "⌥" : "Alt")
}
export function uniqueName(base, existing) {
  const taken = new Set(existing)
  if (!taken.has(base)) return base
  let index = 2
  while (taken.has(`${base} ${index}`)) index += 1
  return `${base} ${index}`
}
export function noop() {}
/* -------------------------------------------------------------------------- */
/* Small UI primitives shared by the editor files                             */
/* -------------------------------------------------------------------------- */
export function PdfEditorTooltip({
  label,
  shortcut,
  children
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span className="inline-flex items-center gap-2">
          {label}
          {shortcut ? (
            <Kbd className="h-4 min-w-4 px-1 text-[10px]">
              {formatShortcut(shortcut)}
            </Kbd>
          ) : null}
        </span>
      </TooltipContent>
    </Tooltip>
  )
}
export function PdfEditorToolButton({
  label,
  shortcut,
  active = false,
  className,
  children,
  size = "icon-sm",
  variant = "ghost",
  ...props
}) {
  return (
    <PdfEditorTooltip label={label} shortcut={shortcut}>
      <Button
        type="button"
        variant={variant}
        size={size}
        aria-label={label}
        aria-pressed={active}
        data-active={active ? "" : undefined}
        className={cn(
          active &&
            "bg-accent text-accent-foreground ring-1 ring-ring/40 ring-inset",
          className
        )}
        {...props}
      >
        {children}
      </Button>
    </PdfEditorTooltip>
  )
}
export function PdfEditorToolbarSeparator({
  className
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("mx-1 h-4 w-px shrink-0 self-center bg-border", className)}
    />
  )
}
export function PdfEditorPanelHeader({
  title,
  description,
  actions,
  onClose
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-2 border-b px-3 py-2.5">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-foreground">
          {title}
        </div>
        {description ? (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {actions}
        {onClose ? (
          <PdfEditorToolButton
            label="Close panel"
            size="icon-xs"
            onClick={onClose}
          >
            <CloseGlyph className="size-3.5" />
          </PdfEditorToolButton>
        ) : null}
      </div>
    </div>
  )
}
export function PdfEditorEmptyState({
  glyph: Glyph,
  title,
  description,
  action,
  className
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 px-4 py-10 text-center",
        className
      )}
    >
      {Glyph ? (
        <div className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
          <Glyph className="size-5" />
        </div>
      ) : null}
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description ? (
        <div className="max-w-56 text-xs text-muted-foreground">
          {description}
        </div>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
export function PdfEditorSection({
  title,
  actions,
  children,
  className
}) {
  return (
    <section className={cn("space-y-2", className)}>
      {title || actions ? (
        <div className="flex items-center justify-between gap-2">
          {title ? (
            <div className="text-xs font-medium text-muted-foreground">
              {title}
            </div>
          ) : (
            <span />
          )}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  )
}
export function PdfEditorFieldLabel({
  children,
  htmlFor,
  className
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("block text-xs font-medium text-foreground", className)}
    >
      {children}
    </label>
  )
}
export function PdfEditorCheckbox({
  checked,
  disabled,
  label,
  description,
  onCheckedChange,
  className
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex w-full items-start gap-2 rounded-md px-1 py-1 text-left text-sm outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 grid size-4 shrink-0 place-items-center rounded border transition-colors",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input bg-background"
        )}
      >
        {checked ? <CheckGlyph className="size-3" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block leading-4">{label}</span>
        {description ? (
          <span className="block text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  )
}
export function PdfEditorSwatch({
  color,
  active,
  label,
  onClick,
  size = "md"
}) {
  const isTransparent = color === "transparent"
  const accessibleLabel = label ?? (isTransparent ? "No fill" : color)
  const swatch = (
    <button
      type="button"
      aria-label={accessibleLabel}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative shrink-0 rounded-full border border-black/10 transition-transform outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/15",
        size === "sm" ? "size-4" : "size-5",
        active && "ring-2 ring-ring ring-offset-2 ring-offset-background"
      )}
      style={
        isTransparent
          ? {
              backgroundImage:
                "linear-gradient(45deg, transparent 45%, #ef4444 45%, #ef4444 55%, transparent 55%)",
              backgroundColor: "#fff",
            }
          : { backgroundColor: color }
      }
    />
  )
  return label ? (
    <PdfEditorTooltip label={label}>{swatch}</PdfEditorTooltip>
  ) : (
    swatch
  )
}
const DEFAULT_SCROLL_AREA_VIEWPORT_SELECTOR =
  '[data-slot="scroll-area-viewport"]'
export function resolveDefaultScrollAreaViewport(container) {
  return container.querySelector(DEFAULT_SCROLL_AREA_VIEWPORT_SELECTOR);
}
export const PdfEditorScrollAreaResolverContext =
  React.createContext(resolveDefaultScrollAreaViewport)
function setRefValue(ref, value) {
  if (!ref) return
  if (typeof ref === "function") {
    ref(value)
  } else {
    ref.current = value
  }
}
export function PdfEditorScrollArea({
  children,
  className,
  orientation = "vertical",
  scrollbarGutter = true,
  viewportClassName,
  viewportProps,
  viewportRef
}) {
  const resolveViewport = React.useContext(PdfEditorScrollAreaResolverContext)
  const containerRef = React.useRef(null)
  const { className: viewportPropsClassName, ...resolvedViewportProps } =
    viewportProps ?? {}
  const setViewportRef = React.useCallback(
    (viewport) => {
      setRefValue(viewportRef, viewport)
    },
    [viewportRef]
  )
  React.useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const viewport = resolveViewport(container)
    if (!viewport) {
      console.error(
        `PDFEditor could not resolve the scroll viewport. Add ${DEFAULT_SCROLL_AREA_VIEWPORT_SELECTOR} to your ScrollArea viewport or pass resolveScrollAreaViewport.`
      )
      return
    }
    setViewportRef(viewport)
    return () => setViewportRef(null)
  }, [resolveViewport, setViewportRef])
  return (
    <div
      ref={containerRef}
      data-slot="pdf-editor-scroll-area"
      className={cn("size-full min-h-0", className)}
    >
      <InlineScrollArea2
        className="size-full min-h-0"
        orientation={orientation}
        scrollbarGutter={scrollbarGutter}
      >
        <div
          {...resolvedViewportProps}
          data-slot="pdf-editor-scroll-content"
          className={cn(
            "min-h-full",
            viewportPropsClassName,
            viewportClassName
          )}
        >
          {children}
        </div>
      </InlineScrollArea2>
    </div>
  )
}

function InlineScrollArea2({
  className,
  children,
  orientation = "both",
  scrollFade = false,
  scrollbarGutter = false,
  scrollbarOverflowOnly = false,
  viewportClassName,
  viewportProps,
  viewportRef,
  ...props
}) {
  const localViewportRef = React.useRef(null)
  const {
    className: viewportPropsClassName,
    ref: viewportPropsRef,
    style: viewportStyle,
    ...resolvedViewportProps
  } = viewportProps ?? {}
  const resolvedViewportStyle = { ...viewportStyle }
  delete resolvedViewportStyle.overflow
  const composedViewportRef = React.useMemo(
    () => InlineComposeRefs(localViewportRef, viewportPropsRef, viewportRef),
    [viewportPropsRef, viewportRef]
  )

  React.useEffect(() => {
    const viewport = localViewportRef.current
    if (!viewport || !scrollFade) return
    const updateOverflow = () => {
      const x = Math.abs(viewport.scrollLeft)
      const y = Math.max(0, viewport.scrollTop)
      const overflow = {
        "x-start": x,
        "x-end": Math.max(0, viewport.scrollWidth - viewport.clientWidth - x),
        "y-start": y,
        "y-end": Math.max(0, viewport.scrollHeight - viewport.clientHeight - y),
      }
      for (const [edge, value] of Object.entries(overflow)) {
        viewport.style.setProperty(
          `--scroll-area-overflow-${edge}`,
          `${value}px`
        )
      }
    }
    const observer = new ResizeObserver(updateOverflow)
    observer.observe(viewport)
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild)
    viewport.addEventListener("scroll", updateOverflow, { passive: true })
    updateOverflow()
    return () => {
      observer.disconnect()
      viewport.removeEventListener("scroll", updateOverflow)
    }
  }, [scrollFade])

  if (
    !viewportProps &&
    !viewportRef &&
    !viewportClassName &&
    !scrollFade &&
    !scrollbarGutter &&
    !scrollbarOverflowOnly
  ) {
    return (
      <InlineScrollArea
        {...props}
        className={cn(
          "size-full min-h-0",
          orientation === "horizontal" &&
            "[&>[data-orientation=vertical]]:hidden",
          className
        )}
      >
        {children}
        {orientation !== "vertical" ? (
          <ScrollBar orientation="horizontal" />
        ) : null}
      </InlineScrollArea>
    )
  }

  return (
    <ScrollAreaPrimitive.Root
      type={scrollbarOverflowOnly ? "auto" : "hover"}
      data-slot="scroll-area"
      className={cn("size-full min-h-0 overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        {...resolvedViewportProps}
        style={resolvedViewportStyle}
        ref={composedViewportRef}
        data-slot="scroll-area-viewport"
        className={cn(
          "h-full w-full rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring",
          scrollFade &&
            "mask-t-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-start)))] mask-r-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-x-end)))] mask-b-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-end)))] mask-l-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-x-start)))] [--fade-size:1.5rem]",
          scrollbarGutter && orientation !== "vertical" && "pb-3.5",
          scrollbarGutter && orientation !== "horizontal" && "pe-3.5",
          viewportPropsClassName,
          viewportClassName
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {orientation !== "horizontal" ? (
        <ScrollBar orientation="vertical" />
      ) : null}
      {orientation !== "vertical" ? (
        <ScrollBar orientation="horizontal" />
      ) : null}
      {orientation === "both" ? <ScrollAreaPrimitive.Corner /> : null}
    </ScrollAreaPrimitive.Root>
  )
}
function InlineComposeRefs(...refs) {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === "function") ref(node)
      else ref.current = node
    }
  };
}
