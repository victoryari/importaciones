export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  image: string;
  slug: string;
}

export const CATEGORIES: Category[] = [
  { id: '1', name: 'Menaje', image: 'https://images.unsplash.com/photo-1584346133934-a3afd2a33c4c?q=80&w=400&h=400&fit=crop', slug: 'menaje' },
  { id: '2', name: 'Vajillas', image: 'https://images.unsplash.com/photo-1544991583-50027010a69a?q=80&w=400&h=400&fit=crop', slug: 'vajillas' },
  { id: '3', name: 'Bar y Coctelería', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=400&h=400&fit=crop', slug: 'bar' },
  { id: '4', name: 'Hogar', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?q=80&w=400&h=400&fit=crop', slug: 'hogar' },
];

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Juego de Copas de Cristal Premium',
    price: 89.90,
    image: 'https://images.unsplash.com/photo-1544991583-50027010a69a?q=80&w=500&h=500&fit=crop',
    category: 'bar'
  },
  {
    id: 'p2',
    name: 'Tetera de Porcelana Blanca 2L',
    price: 45.00,
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=500&h=500&fit=crop',
    category: 'menaje'
  },
  {
    id: 'p3',
    name: 'Sartén de Hierro Fundido 25cm',
    price: 120.00,
    image: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?q=80&w=500&h=500&fit=crop',
    category: 'menaje'
  },
  {
    id: 'p4',
    name: 'Set de Vajilla Cerámica 16 Piezas',
    price: 210.00,
    image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?q=80&w=500&h=500&fit=crop',
    category: 'vajillas'
  },
  {
    id: 'p5',
    name: 'Termo de Acero Inoxidable 1.5L',
    price: 65.00,
    image: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?q=80&w=500&h=500&fit=crop',
    category: 'hogar'
  },
  {
    id: 'p6',
    name: 'Decantador de Vino Elegance',
    price: 110.00,
    image: 'https://images.unsplash.com/photo-1585553616435-2dc0a54e271d?q=80&w=500&h=500&fit=crop',
    category: 'bar'
  },
];
