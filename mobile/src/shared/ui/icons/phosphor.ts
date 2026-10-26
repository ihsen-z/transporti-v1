import type { Icon as PhosphorIcon } from 'phosphor-react-native';

// Correspondance entre les noms d'icônes de l'application et le jeu Phosphor.
//
// Les noms de GAUCHE sont le contrat : une quarantaine de fichiers les
// utilisent, et ils décrivent un RÔLE dans le produit (`inbox`, `route`,
// `shield-check`) plutôt qu'un dessin. C'est ce qui permet de changer de jeu
// d'icônes — ce que fait ce fichier — sans toucher aux écrans.
//
// Les imports sont PROFONDS (`phosphor-react-native/lib/commonjs/icons/House`) et non
// pris sur le baril du paquet. Le baril réexporte 1512 icônes : Metro ne fait
// pas de tree-shaking, elles atterriraient toutes dans le bundle. Ici on paie
// les quarante qu'on utilise.
import { BellIcon } from 'phosphor-react-native/lib/commonjs/icons/Bell';
import { CalendarBlankIcon } from 'phosphor-react-native/lib/commonjs/icons/CalendarBlank';
import { CameraIcon } from 'phosphor-react-native/lib/commonjs/icons/Camera';
import { CaretDownIcon } from 'phosphor-react-native/lib/commonjs/icons/CaretDown';
import { CaretLeftIcon } from 'phosphor-react-native/lib/commonjs/icons/CaretLeft';
import { CaretRightIcon } from 'phosphor-react-native/lib/commonjs/icons/CaretRight';
import { CaretUpIcon } from 'phosphor-react-native/lib/commonjs/icons/CaretUp';
import { ChatCircleDotsIcon } from 'phosphor-react-native/lib/commonjs/icons/ChatCircleDots';
import { CheckCircleIcon } from 'phosphor-react-native/lib/commonjs/icons/CheckCircle';
import { CheckIcon } from 'phosphor-react-native/lib/commonjs/icons/Check';
import { ClockIcon } from 'phosphor-react-native/lib/commonjs/icons/Clock';
import { CompassIcon } from 'phosphor-react-native/lib/commonjs/icons/Compass';
import { EnvelopeIcon } from 'phosphor-react-native/lib/commonjs/icons/Envelope';
import { FileTextIcon } from 'phosphor-react-native/lib/commonjs/icons/FileText';
import { HeartIcon } from 'phosphor-react-native/lib/commonjs/icons/Heart';
import { HouseIcon } from 'phosphor-react-native/lib/commonjs/icons/House';
import { InfoIcon } from 'phosphor-react-native/lib/commonjs/icons/Info';
import { LockIcon } from 'phosphor-react-native/lib/commonjs/icons/Lock';
import { MagnifyingGlassIcon } from 'phosphor-react-native/lib/commonjs/icons/MagnifyingGlass';
import { MapPinIcon } from 'phosphor-react-native/lib/commonjs/icons/MapPin';
import { MoneyIcon } from 'phosphor-react-native/lib/commonjs/icons/Money';
import { PackageIcon } from 'phosphor-react-native/lib/commonjs/icons/Package';
import { PaperPlaneRightIcon } from 'phosphor-react-native/lib/commonjs/icons/PaperPlaneRight';
import { PathIcon } from 'phosphor-react-native/lib/commonjs/icons/Path';
import { PencilSimpleIcon } from 'phosphor-react-native/lib/commonjs/icons/PencilSimple';
import { PhoneIcon } from 'phosphor-react-native/lib/commonjs/icons/Phone';
import { PlusCircleIcon } from 'phosphor-react-native/lib/commonjs/icons/PlusCircle';
import { PlusIcon } from 'phosphor-react-native/lib/commonjs/icons/Plus';
import { RoadHorizonIcon } from 'phosphor-react-native/lib/commonjs/icons/RoadHorizon';
import { ScalesIcon } from 'phosphor-react-native/lib/commonjs/icons/Scales';
import { ShieldCheckIcon } from 'phosphor-react-native/lib/commonjs/icons/ShieldCheck';
import { StarIcon } from 'phosphor-react-native/lib/commonjs/icons/Star';
import { TrayIcon } from 'phosphor-react-native/lib/commonjs/icons/Tray';
import { TrendUpIcon } from 'phosphor-react-native/lib/commonjs/icons/TrendUp';
import { TruckIcon } from 'phosphor-react-native/lib/commonjs/icons/Truck';
import { UserIcon } from 'phosphor-react-native/lib/commonjs/icons/User';
import { WalletIcon } from 'phosphor-react-native/lib/commonjs/icons/Wallet';
import { WarningCircleIcon } from 'phosphor-react-native/lib/commonjs/icons/WarningCircle';
import { WrenchIcon } from 'phosphor-react-native/lib/commonjs/icons/Wrench';
import { XIcon } from 'phosphor-react-native/lib/commonjs/icons/X';

export const PHOSPHOR = {
  banknote: MoneyIcon,
  bell: BellIcon,
  calendar: CalendarBlankIcon,
  camera: CameraIcon,
  check: CheckIcon,
  'chevron-down': CaretDownIcon,
  'chevron-left': CaretLeftIcon,
  'chevron-right': CaretRightIcon,
  'chevron-up': CaretUpIcon,
  'circle-alert': WarningCircleIcon,
  'circle-check': CheckCircleIcon,
  'circle-plus': PlusCircleIcon,
  clock: ClockIcon,
  compass: CompassIcon,
  'file-text': FileTextIcon,
  heart: HeartIcon,
  house: HouseIcon,
  inbox: TrayIcon,
  info: InfoIcon,
  lock: LockIcon,
  mail: EnvelopeIcon,
  'map-pin': MapPinIcon,
  'message-circle': ChatCircleDotsIcon,
  package: PackageIcon,
  // `path` = le tracé d'un itinéraire ; `route` = la route elle-même. Deux
  // dessins distincts, parce que l'application distingue les deux.
  path: PathIcon,
  pencil: PencilSimpleIcon,
  phone: PhoneIcon,
  plus: PlusIcon,
  route: RoadHorizonIcon,
  scale: ScalesIcon,
  search: MagnifyingGlassIcon,
  send: PaperPlaneRightIcon,
  'shield-check': ShieldCheckIcon,
  star: StarIcon,
  'trending-up': TrendUpIcon,
  truck: TruckIcon,
  user: UserIcon,
  wallet: WalletIcon,
  wrench: WrenchIcon,
  x: XIcon,
} satisfies Record<string, PhosphorIcon>;

/**
 * Icônes dont le dessin porte un SENS de lecture (un chevron « suivant », un
 * avion en papier qui part). Phosphor sait les retourner lui-même via sa prop
 * `mirrored` ; ce jeu dit lesquelles en ont besoin.
 *
 * Les autres ne doivent PAS être retournées : une maison miroir reste une
 * maison, mais une horloge miroir devient fausse.
 */
export const DIRECTIONAL: ReadonlySet<string> = new Set([
  'chevron-left',
  'chevron-right',
  'send',
  'path',
  'route',
  'trending-up',
]);
