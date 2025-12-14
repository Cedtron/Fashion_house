import React, { useEffect, useState } from 'react';
import PageMeta from '../components/common/PageMeta';
import api from '../utils/axios';
import ProductForm from '../components/products/ProductForm';

export default function ProductsPage(){
  const [products, setProducts] = useState<any[]>([]);
  const [editing, setEditing] = useState<any|null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async ()=>{ try{ const res = await api.get('/stock'); setProducts(res.data); }catch(e){ console.error(e) } };
  useEffect(()=>{ load(); },[]);

  return (<div className="p-4">
    <PageMeta title="Products" description="Manage products" />
    <h2 className="text-xl font-bold mb-4">Products</h2>
    <button className="btn btn-indigo mb-4" onClick={()=>{ setEditing(null); setShowForm(true); }}>Add Product</button>
    {showForm && <div className="mb-4"><ProductForm product={editing} onSaved={(p:any)=>{ setShowForm(false); load(); }} onCancel={()=>setShowForm(false)} /></div>}
    <div className="grid grid-cols-1 gap-4">
      {products.map(p=> (
        <div key={p.id} className="p-4 border rounded flex items-center justify-between">
          <div>
            <div className="font-semibold">{p.name}</div>
            <div className="text-sm">Code: {p.productCode}</div>
            <div className="text-sm">Price: {p.price}</div>
          </div>
          <div className="flex gap-2">
            <button className="btn" onClick={()=>{ setEditing(p); setShowForm(true); }}>Edit</button>
            <button className="btn btn-danger" onClick={async ()=>{ if(confirm('Delete?')){ await api.delete('/products/'+p.id); load(); } }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  </div>); }