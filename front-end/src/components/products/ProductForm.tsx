import React, { useState } from 'react';
import api from '../../utils/axios';

export default function ProductForm({ product, onSaved, onCancel }: any) {
  const [name, setName] = useState(product?.name || '');
  const [productCode, setProductCode] = useState(product?.productCode || '');
  const [price, setPrice] = useState(product?.price || 0);
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: any) => {
    e?.preventDefault();
    setLoading(true);
    try{
      const form = new FormData();
      form.append('name', name);
      form.append('productCode', productCode);
      form.append('price', String(price));
      if(image) form.append('file', image);
      if(product?.id){
        const res = await api.put('/products/' + product.id, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        onSaved(res.data);
      } else {
        const res = await api.post('/products', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        onSaved(res.data);
      }
    }catch(err){ console.error(err); alert('Failed to save'); }
    setLoading(false);
  };

  return (<form onSubmit={submit} className="p-4 bg-white rounded shadow">
    <div className="grid grid-cols-1 gap-3">
      <input className="border p-2" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
      <input className="border p-2" placeholder="Product Code" value={productCode} onChange={e=>setProductCode(e.target.value)} />
      <input type="number" className="border p-2" placeholder="Price" value={price} onChange={e=>setPrice(Number(e.target.value))} />
      <input type="file" accept="image/*" onChange={e=>setImage(e.target.files?.[0]||null)} />
      <div className="flex gap-2">
        <button type="submit" className="btn btn-indigo">{loading ? 'Saving...' : 'Save'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  </form>);
}