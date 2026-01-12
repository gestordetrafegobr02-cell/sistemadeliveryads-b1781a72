import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, LogOut, Store, Package, Tag, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface StoreData {
  id: string;
  name: string;
  slug: string;
  whatsapp: string | null;
  pix_key: string | null;
  facebook_pixel_id: string | null;
  delivery_fee: number | null;
}

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  is_available: boolean;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [store, setStore] = useState<StoreData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Store form
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixelId, setPixelId] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');

  // Product dialog
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productImage, setProductImage] = useState('');
  const [productCategory, setProductCategory] = useState<string>('');

  // Category dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  async function fetchData() {
    const { data: storeData } = await supabase
      .from('stores')
      .select('*')
      .eq('owner_id', user!.id)
      .maybeSingle();

    if (storeData) {
      setStore(storeData);
      setStoreName(storeData.name);
      setStoreSlug(storeData.slug);
      setWhatsapp(storeData.whatsapp || '');
      setPixKey(storeData.pix_key || '');
      setPixelId(storeData.facebook_pixel_id || '');
      setDeliveryFee(storeData.delivery_fee ? String(storeData.delivery_fee) : '');

      const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('*').eq('store_id', storeData.id).order('sort_order'),
        supabase.from('products').select('*').eq('store_id', storeData.id).order('sort_order'),
      ]);

      setCategories(catRes.data || []);
      setProducts(prodRes.data || []);
    }

    setLoading(false);
  }

  async function handleSaveStore() {
    if (!storeName.trim() || !storeSlug.trim()) {
      toast.error('Nome e slug são obrigatórios');
      return;
    }

    setSaving(true);

    try {
      if (store) {
        const { error } = await supabase
          .from('stores')
          .update({
            name: storeName,
            slug: storeSlug.toLowerCase().replace(/\s+/g, '-'),
            whatsapp,
            pix_key: pixKey,
            facebook_pixel_id: pixelId,
            delivery_fee: deliveryFee ? parseFloat(deliveryFee.replace(',', '.')) : 0,
          })
          .eq('id', store.id);

        if (error) {
          console.error('Store update error:', error);
          toast.error('Erro ao salvar: ' + error.message);
        } else {
          toast.success('Loja atualizada!');
          await fetchData();
        }
      } else {
        const { error } = await supabase.from('stores').insert({
          owner_id: user!.id,
          name: storeName,
          slug: storeSlug.toLowerCase().replace(/\s+/g, '-'),
          whatsapp,
          pix_key: pixKey,
          facebook_pixel_id: pixelId,
          delivery_fee: deliveryFee ? parseFloat(deliveryFee.replace(',', '.')) : 0,
        });

        if (error) {
          console.error('Store insert error:', error);
          if (error.message.includes('duplicate')) {
            toast.error('Esse slug já está em uso');
          } else {
            toast.error('Erro ao criar loja: ' + error.message);
          }
        } else {
          toast.success('Loja criada!');
          await fetchData();
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Erro inesperado ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCategory() {
    if (!categoryName.trim() || !store) return;

    const { error } = await supabase.from('categories').insert({
      store_id: store.id,
      name: categoryName,
      sort_order: categories.length,
    });

    if (error) {
      toast.error('Erro ao criar categoria');
    } else {
      toast.success('Categoria criada!');
      setCategoryName('');
      setCategoryDialogOpen(false);
      fetchData();
    }
  }

  async function handleDeleteCategory(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir categoria');
    } else {
      toast.success('Categoria excluída');
      fetchData();
    }
  }

  function openProductDialog(product?: Product) {
    if (product) {
      setEditingProduct(product);
      setProductName(product.name);
      setProductDescription(product.description || '');
      setProductPrice(String(product.price));
      setProductImage(product.image_url || '');
      setProductCategory(product.category_id || '');
    } else {
      setEditingProduct(null);
      setProductName('');
      setProductDescription('');
      setProductPrice('');
      setProductImage('');
      setProductCategory('');
    }
    setProductDialogOpen(true);
  }

  async function handleSaveProduct() {
    if (!productName.trim() || !productPrice.trim() || !store) return;

    const productData = {
      store_id: store.id,
      name: productName,
      description: productDescription || null,
      price: parseFloat(productPrice.replace(',', '.')),
      image_url: productImage || null,
      category_id: productCategory || null,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);

      if (error) {
        toast.error('Erro ao atualizar produto');
      } else {
        toast.success('Produto atualizado!');
      }
    } else {
      const { error } = await supabase.from('products').insert({
        ...productData,
        sort_order: products.length,
      });

      if (error) {
        toast.error('Erro ao criar produto');
      } else {
        toast.success('Produto criado!');
      }
    }

    setProductDialogOpen(false);
    fetchData();
  }

  async function handleDeleteProduct(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir produto');
    } else {
      toast.success('Produto excluído');
      fetchData();
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-2xl text-gradient">Painel Admin</h1>
          <div className="flex items-center gap-3">
            {store && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/shop/${store.slug}`, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Ver Loja
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="store" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="store" className="gap-2">
              <Store className="w-4 h-4" />
              Loja
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Tag className="w-4 h-4" />
              Categorias
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="w-4 h-4" />
              Produtos
            </TabsTrigger>
          </TabsList>

          {/* Store Tab */}
          <TabsContent value="store">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display text-xl">Configurações da Loja</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome da Loja</Label>
                    <Input
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Burger House"
                      className="mt-1 bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <Label>Slug (URL)</Label>
                    <Input
                      value={storeSlug}
                      onChange={(e) => setStoreSlug(e.target.value)}
                      placeholder="burger-house"
                      className="mt-1 bg-secondary border-border"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Sua loja: /shop/{storeSlug || 'seu-slug'}
                    </p>
                  </div>
                  <div>
                    <Label>WhatsApp (com DDD)</Label>
                    <Input
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="5511999999999"
                      className="mt-1 bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <Label>Chave PIX</Label>
                    <Input
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="sua@chave.pix"
                      className="mt-1 bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <Label>Facebook Pixel ID</Label>
                    <Input
                      value={pixelId}
                      onChange={(e) => setPixelId(e.target.value)}
                      placeholder="123456789"
                      className="mt-1 bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <Label>Taxa de Entrega Padrão (R$)</Label>
                    <Input
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      placeholder="5,00"
                      className="mt-1 bg-secondary border-border"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Taxa fixa cobrada para entregas
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleSaveStore}
                  disabled={saving}
                  className="btn-glow bg-primary text-primary-foreground"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {store ? 'Salvar Alterações' : 'Criar Loja'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display text-xl">Categorias</CardTitle>
                <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2 bg-primary text-primary-foreground" disabled={!store}>
                      <Plus className="w-4 h-4" />
                      Nova Categoria
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="font-display">Nova Categoria</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome</Label>
                        <Input
                          value={categoryName}
                          onChange={(e) => setCategoryName(e.target.value)}
                          placeholder="Hambúrgueres"
                          className="mt-1 bg-secondary border-border"
                        />
                      </div>
                      <Button onClick={handleSaveCategory} className="w-full bg-primary text-primary-foreground">
                        Criar Categoria
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {!store ? (
                  <p className="text-muted-foreground text-center py-8">
                    Crie sua loja primeiro para adicionar categorias.
                  </p>
                ) : categories.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma categoria ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-3 glass-card"
                      >
                        <span className="font-medium">{cat.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display text-xl">Produtos</CardTitle>
                <Button
                  size="sm"
                  className="gap-2 bg-primary text-primary-foreground"
                  onClick={() => openProductDialog()}
                  disabled={!store}
                >
                  <Plus className="w-4 h-4" />
                  Novo Produto
                </Button>
              </CardHeader>
              <CardContent>
                {!store ? (
                  <p className="text-muted-foreground text-center py-8">
                    Crie sua loja primeiro para adicionar produtos.
                  </p>
                ) : products.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum produto ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-4 p-3 glass-card"
                      >
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-14 h-14 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{product.name}</h4>
                          <p className="text-primary font-semibold">
                            R$ {Number(product.price).toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openProductDialog(product)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Product Dialog */}
        <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
          <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="X-Bacon Especial"
                  className="mt-1 bg-secondary border-border"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Hambúrguer artesanal com bacon crocante..."
                  className="mt-1 bg-secondary border-border"
                />
              </div>
              <div>
                <Label>Preço (R$)</Label>
                <Input
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  placeholder="29,90"
                  className="mt-1 bg-secondary border-border"
                />
              </div>
              <div>
                <Label>URL da Imagem</Label>
                <Input
                  value={productImage}
                  onChange={(e) => setProductImage(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 bg-secondary border-border"
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select 
                  value={productCategory || "none"} 
                  onValueChange={(val) => setProductCategory(val === "none" ? "" : val)}
                >
                  <SelectTrigger className="mt-1 bg-secondary border-border">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveProduct} className="w-full bg-primary text-primary-foreground">
                {editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
