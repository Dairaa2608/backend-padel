// Ayudas para mostrar los productos que llegan de la API.
import imgPala from '../img/adidas-pala-de-padel-cross-it-light-3.4-2025_1.webp'
import imgPelotas from '../img/tubo-de-3-bolas-de-padel-presurizadas-kuikma-pb-club.jpg'
import imgMuñequera from '../img/munequera-y-cinturon.webp'
import imgPaletero from '../img/paletero pro.webp'
import imgCamiseta from '../img/camisa dry fit.jpg'
import imgGrip from '../img/grip antidezlizante.jpg'

// Las fotos siguen dentro del frontend: se asocian a cada producto por su nombre
const productImages = {
  'Pala Profesional Adidas': imgPala,
  'Pack de Pelotas Oficiales': imgPelotas,
  'Muñequera + Cinturón': imgMuñequera,
  'Paletero Deportivo Wilson': imgPaletero,
  'Camiseta Técnica Dry-Fit': imgCamiseta,
  'Grip Antideslizante Premium': imgGrip,
}

const badgeColors = {
  Nuevo: '#0a7c5c',
  Oferta: '#e53935',
  Destacado: '#1565c0',
  Agotado: '#757575',
}

// Convierte un producto de la API al formato que usa la tienda
export const toViewProduct = (product) => {
  const outOfStock = product.stock <= 0
  const badge = outOfStock ? 'Agotado' : product.badge || null
  return {
    id: product._id,
    name: product.name,
    desc: product.description,
    price: product.price,
    stock: product.stock,
    outOfStock,
    badge,
    badgeColor: badge ? badgeColors[badge] ?? '#0a7c5c' : null,
    img: product.imageUrl || productImages[product.name] || imgPala,
  }
}
