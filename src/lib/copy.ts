/**
 * Interface copy of the store, cart and checkout in English, French and Arabic.
 * Product names, subtitles and descriptions come from the store database and
 * are shown as entered there (demo catalogue in English).
 */
import type { T } from './i18n'

export const CATEGORY: Record<string, T> = {
  guembri: { en: 'Guembri', fr: 'Guembri', ar: 'الكَمبري' },
  qraqeb: { en: 'Qraqeb', fr: 'Qraqeb', ar: 'القراقب' },
  accessories: { en: 'Accessories', fr: 'Accessoires', ar: 'الإكسسوارات' },
  clothing: { en: 'Clothing', fr: 'Vêtements', ar: 'الملابس' },
  exclusive: { en: 'Exclusive', fr: 'Exclusif', ar: 'حصري' },
}

export const C = {
  home: { en: 'Home', fr: 'Accueil', ar: 'الرئيسية' },
  collection: { en: 'Collection', fr: 'Collection', ar: 'المجموعة' },
  theCollection: { en: 'The collection', fr: 'La collection', ar: 'المجموعة' },
  bannerKicker: { en: 'GNAWA · The collection', fr: 'GNAWA · La collection', ar: 'كناوة · المجموعة' },
  pieces: { en: 'pieces', fr: 'pièces', ar: 'قطعة' },
  piece: { en: 'piece', fr: 'pièce', ar: 'قطعة' },
  title1: { en: 'Instruments', fr: 'Les instruments', ar: 'آلات' },
  title2: { en: 'of the lila.', fr: 'de la lila.', ar: 'الليلة.' },
  bannerLead: {
    en: 'Guembris in six finishes and sizes, qraqeb, strings, bindings and stage textiles. Cash on delivery across Morocco.',
    fr: 'Des guembris en six finitions et tailles, des qraqeb, des cordes, des ligatures et des textiles de scène. Paiement à la livraison partout au Maroc.',
    ar: 'كنابر بستّ تشطيبات وأحجام، وقراقب، وأوتار، وأربطة، وملابس للخشبة. الدفع عند الاستلام في كل أنحاء المغرب.',
  },
  newIn: { en: 'New in', fr: 'Nouveauté', ar: 'جديد' },
  discover: { en: 'Discover', fr: 'Découvrir', ar: 'اكتشف' },
  all: { en: 'All', fr: 'Tout', ar: 'الكل' },
  allPieces: { en: 'All pieces', fr: 'Toutes les pièces', ar: 'كل القطع' },
  inStock: { en: 'In stock', fr: 'En stock', ar: 'متوفّر' },
  sortBy: { en: 'Sort by', fr: 'Trier par', ar: 'ترتيب حسب' },
  featured: { en: 'Featured', fr: 'Sélection', ar: 'مختارات' },
  priceAsc: { en: 'Price, low to high', fr: 'Prix croissant', ar: 'السعر تصاعديًا' },
  priceDesc: { en: 'Price, high to low', fr: 'Prix décroissant', ar: 'السعر تنازليًا' },
  nameAz: { en: 'Name, A to Z', fr: 'Nom, de A à Z', ar: 'الاسم أبجديًا' },
  nothing: { en: 'Nothing matches these filters.', fr: 'Aucune pièce ne correspond à ces filtres.', ar: 'لا شيء يطابق هذه المرشّحات.' },
  showAll: { en: 'Show all pieces', fr: 'Voir toutes les pièces', ar: 'عرض كل القطع' },
  demoNote: {
    en: 'Demonstration catalogue: products, prices and stock are sample data, configurable in the store database, until the real catalogue is confirmed.',
    fr: 'Catalogue de démonstration : produits, prix et stocks sont des données d’exemple, modifiables dans la base de la boutique, en attendant le catalogue réel.',
    ar: 'كتالوج تجريبي: المنتجات والأسعار والمخزون بيانات نموذجية قابلة للتعديل في قاعدة بيانات المتجر، إلى حين اعتماد الكتالوج الحقيقي.',
  },
  soldOut: { en: 'Sold out', fr: 'Épuisé', ar: 'نفد' },
  new: { en: 'New', fr: 'Nouveau', ar: 'جديد' },
  onlyLeft: { en: 'Only {n} left', fr: 'Plus que {n}', ar: 'بقي {n} فقط' },
  illustration: { en: 'Illustration', fr: 'Illustration', ar: 'رسم توضيحي' },
  addToCart: { en: 'Add to cart', fr: 'Ajouter au panier', ar: 'أضف إلى السلة' },
  chooseOptions: { en: 'Choose options', fr: 'Choisir les options', ar: 'اختر الخيارات' },
  options: { en: 'options', fr: 'options', ar: 'خيارات' },
  from: { en: 'From', fr: 'Dès', ar: 'ابتداءً من' },
  services: [
    [
      { en: 'Cash on delivery', fr: 'Paiement à la livraison', ar: 'الدفع عند الاستلام' },
      { en: 'Pay the courier when the parcel arrives. Nothing is charged online.', fr: 'Payez le livreur à la réception du colis. Rien n’est débité en ligne.', ar: 'ادفع لعامل التوصيل عند وصول الطرد. لا يُقتطع أي مبلغ عبر الإنترنت.' },
    ],
    [
      { en: 'Delivery across Morocco', fr: 'Livraison partout au Maroc', ar: 'التوصيل في كل المغرب' },
      { en: 'Every city, with the fee confirmed before dispatch.', fr: 'Dans chaque ville, avec des frais confirmés avant l’envoi.', ar: 'إلى كل المدن، مع تأكيد الرسوم قبل الإرسال.' },
    ],
    [
      { en: 'Confirmed by phone', fr: 'Confirmée par téléphone', ar: 'تأكيد بالهاتف' },
      { en: 'We call to confirm the order and a time that suits you.', fr: 'Nous vous appelons pour confirmer la commande et un horaire qui vous convient.', ar: 'نتصل بك لتأكيد الطلب واختيار وقت يناسبك.' },
    ],
    [
      { en: 'A reference per order', fr: 'Une référence par commande', ar: 'مرجع لكل طلب' },
      { en: 'Track it any time with its reference, such as GN-3MW6WQ.', fr: 'Suivez-la à tout moment grâce à sa référence, par exemple GN-3MW6WQ.', ar: 'تابعه في أي وقت بمرجعه، مثل GN-3MW6WQ.' },
    ],
  ] as [T, T][],
  // cart
  yourSelection: { en: 'Your selection', fr: 'Votre sélection', ar: 'اختياراتك' },
  cartTitle1: { en: 'The', fr: 'Le', ar: '' },
  cartTitle2: { en: 'cart.', fr: 'panier.', ar: 'السلة.' },
  continue: { en: 'Continue in the collection', fr: 'Continuer dans la collection', ar: 'تابع التصفح في المجموعة' },
  empty: { en: 'Your cart is empty.', fr: 'Votre panier est vide.', ar: 'سلتك فارغة.' },
  emptyLead: {
    en: 'The guembris, qraqeb and accessories wait in the collection. Here are three to begin with.',
    fr: 'Les guembris, les qraqeb et les accessoires vous attendent dans la collection. En voici trois pour commencer.',
    ar: 'الكنابر والقراقب والإكسسوارات بانتظارك في المجموعة. إليك ثلاثًا للبداية.',
  },
  explore: { en: 'Explore the collection', fr: 'Découvrir la collection', ar: 'اكتشف المجموعة' },
  each: { en: 'each', fr: 'l’unité', ar: 'للقطعة' },
  remove: { en: 'Remove', fr: 'Retirer', ar: 'حذف' },
  summary: { en: 'Summary', fr: 'Récapitulatif', ar: 'الملخّص' },
  subtotal: { en: 'Subtotal', fr: 'Sous-total', ar: 'المجموع الفرعي' },
  delivery: { en: 'Delivery', fr: 'Livraison', ar: 'التوصيل' },
  byPhone: { en: 'Confirmed by phone', fr: 'Confirmée par téléphone', ar: 'يُؤكَّد بالهاتف' },
  total: { en: 'Estimated total', fr: 'Total estimé', ar: 'المجموع التقديري' },
  checkout: { en: 'Proceed to checkout', fr: 'Passer la commande', ar: 'إتمام الطلب' },
  checkoutShort: { en: 'Checkout', fr: 'Commander', ar: 'إتمام الطلب' },
  cod: { en: 'Pay cash on delivery, anywhere in Morocco. Nothing is charged online.', fr: 'Paiement en espèces à la livraison, partout au Maroc. Rien n’est débité en ligne.', ar: 'ادفع نقدًا عند الاستلام في أي مكان بالمغرب. لا يُقتطع أي مبلغ عبر الإنترنت.' },
  call: { en: 'We call to confirm the order, the delivery fee and a time that suits you.', fr: 'Nous appelons pour confirmer la commande, les frais de livraison et un horaire qui vous convient.', ar: 'نتصل لتأكيد الطلب ورسوم التوصيل والوقت المناسب لك.' },
  yourCart: { en: 'Your cart', fr: 'Votre panier', ar: 'سلّتك' },
  close: { en: 'Close', fr: 'Fermer', ar: 'إغلاق' },
  closeCart: { en: 'Close cart', fr: 'Fermer le panier', ar: 'أغلق السلة' },
  emptyDrawer: { en: 'Your cart is empty', fr: 'Votre panier est vide', ar: 'سلّتك فارغة' },
  emptyDrawerLead: { en: 'Instruments, qraqeb and textiles wait in the collection.', fr: 'Instruments, qraqeb et textiles vous attendent dans la collection.', ar: 'الآلات والقراقب والملابس بانتظارك في المجموعة.' },
  viewCart: { en: 'View cart', fr: 'Voir le panier', ar: 'عرض السلة' },
  drawerNote: { en: 'Delivery and final total are confirmed at checkout.', fr: 'La livraison et le total final sont confirmés à la commande.', ar: 'يُؤكَّد التوصيل والمجموع النهائي عند إتمام الطلب.' },
  // states
  loading: { en: 'Loading', fr: 'Chargement', ar: 'جارٍ التحميل' },
  closed: { en: 'The showroom doors are closed.', fr: 'Les portes du showroom sont fermées.', ar: 'أبواب قاعة العرض مغلقة.' },
  tryAgain: { en: 'Try again', fr: 'Réessayer', ar: 'أعد المحاولة' },
} satisfies Record<string, T | [T, T][]>

/** "{n}" placeholder */
export const fill = (s: string, n: number | string) => s.replace('{n}', String(n))
