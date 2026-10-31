"use client";

import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function SistemaElBucle() {
  // --- 1. ESTADOS DE SESIÓN Y NAVEGACIÓN ---
  const [usuario, setUsuario] = useState(null);
  const [correoLogin, setCorreoLogin] = useState("");
  const [passwordLogin, setPasswordLogin] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  const [pestanaActiva, setPestanaActiva] = useState("compras");
  const [cargando, setCargando] = useState(false);

  // --- 2. ESTADOS DE DATOS DE LA BASE DE DATOS ---
  const [compras, setCompras] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [listaUsuarios, setListaUsuarios] = useState([]);

  // --- 3. ESTADOS DE FORMULARIOS ---
  // Formulario Compras / Insumos
  const [nuevaCompra, setNuevaCompra] = useState({
    fecha: "",
    proveedor: "",
    categoria: "Escenografía",
    descripcion: "",
    monto: "",
  });
  const [archivoFactura, setArchivoFactura] = useState(null);

  // Formulario Pago a Actores
  const [nuevoPago, setNuevoPago] = useState({
    actor: "",
    obra: "",
    concepto: "",
    fecha: "",
    monto: "",
    estado: "Pagado",
  });

  // Formulario Cotizaciones
  const [nuevaCotizacion, setNuevaCotizacion] = useState({
    cliente: "",
    obra_solicitada: "",
    fecha_evento: "",
    valor_total: "",
    detalle_servicio: "",
  });
  const [cotizacionImprimir, setCotizacionImprimir] = useState(null);

  // Formulario Usuarios y Privilegios
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    correo: "",
    password: "",
    rol: "auxiliar",
  });

  // --- 4. CARGA INICIAL Y SESIÓN ---
  useEffect(() => {
    const sesionGuardada = localStorage.getItem("sesion_el_bucle");
    if (sesionGuardada) {
      const userObj = JSON.parse(sesionGuardada);
      setUsuario(userObj);
      cargarDatos();
    }
  }, []);

  const cargarDatos = async () => {
    const { data: dataCompras } = await supabase
      .from("compras_insumos")
      .select("*")
      .order("id", { ascending: false });
    if (dataCompras) setCompras(dataCompras);

    const { data: dataPagos } = await supabase
      .from("pagos_actores")
      .select("*")
      .order("id", { ascending: false });
    if (dataPagos) setPagos(dataPagos);

    const { data: dataCotizaciones } = await supabase
      .from("cotizaciones")
      .select("*")
      .order("id", { ascending: false });
    if (dataCotizaciones) setCotizaciones(dataCotizaciones);

    const { data: dataUsuarios } = await supabase
      .from("usuarios")
      .select("*")
      .order("id", { ascending: true });
    if (dataUsuarios) setListaUsuarios(dataUsuarios);
  };

  // --- 5. FUNCIÓN DE INICIO DE SESIÓN ---
  const iniciarSesion = async (e) => {
    e.preventDefault();
    setErrorLogin("");
    setCargando(true);

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("correo", correoLogin.trim())
      .eq("password", passwordLogin.trim())
      .single();

    setCargando(false);

    if (error || !data) {
      setErrorLogin("Correo o contraseña incorrectos. Verifica tus datos.");
      return;
    }

    setUsuario(data);
    localStorage.setItem("sesion_el_bucle", JSON.stringify(data));
    setPestanaActiva("compras");
    cargarDatos();
  };

  const cerrarSesion = () => {
    setUsuario(null);
    localStorage.removeItem("sesion_el_bucle");
    setCorreoLogin("");
    setPasswordLogin("");
  };

  // --- 6. FUNCIONES CRUD (GUARDAR Y ELIMINAR) ---

  // A. Guardar Compra + Subir Factura al Bucket de Supabase
  const guardarCompra = async (e) => {
    e.preventDefault();
    setCargando(true);
    let urlFactura = null;

    if (archivoFactura) {
      const extension = archivoFactura.name.split(".").pop();
      const nombreArchivo = `factura_${Date.now()}.${extension}`;

      const { error: errorSubida } = await supabase.storage
        .from("facturas")
        .upload(nombreArchivo, archivoFactura);

      if (errorSubida) {
        alert("Error al subir el soporte de factura: " + errorSubida.message);
        setCargando(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("facturas")
        .getPublicUrl(nombreArchivo);

      urlFactura = publicUrlData.publicUrl;
    }

    const { error } = await supabase.from("compras_insumos").insert([
      {
        fecha: nuevaCompra.fecha,
        proveedor: nuevaCompra.proveedor,
        categoria: nuevaCompra.categoria,
        descripcion: nuevaCompra.descripcion,
        monto: parseFloat(nuevaCompra.monto),
        archivo_url: urlFactura,
      },
    ]);

    setCargando(false);

    if (error) {
      alert("Error al guardar compra: " + error.message);
    } else {
      setNuevaCompra({
        fecha: "",
        proveedor: "",
        categoria: "Escenografía",
        descripcion: "",
        monto: "",
      });
      setArchivoFactura(null);
      cargarDatos();
    }
  };

  // B. Guardar Pago a Actor
  const guardarPagoActor = async (e) => {
    e.preventDefault();
    setCargando(true);

    const { error } = await supabase.from("pagos_actores").insert([
      {
        actor: nuevoPago.actor,
        obra: nuevoPago.obra,
        concepto: nuevoPago.concepto,
        fecha: nuevoPago.fecha,
        monto: parseFloat(nuevoPago.monto),
        estado: nuevoPago.estado,
      },
    ]);

    setCargando(false);

    if (error) {
      alert("Error al registrar pago: " + error.message);
    } else {
      setNuevoPago({
        actor: "",
        obra: "",
        concepto: "",
        fecha: "",
        monto: "",
        estado: "Pagado",
      });
      cargarDatos();
    }
  };

  // C. Guardar Cotización
  const guardarCotizacion = async (e) => {
    e.preventDefault();
    setCargando(true);

    const { error } = await supabase.from("cotizaciones").insert([
      {
        cliente: nuevaCotizacion.cliente,
        obra_solicitada: nuevaCotizacion.obra_solicitada,
        fecha_evento: nuevaCotizacion.fecha_evento,
        valor_total: parseFloat(nuevaCotizacion.valor_total),
        detalle_servicio: nuevaCotizacion.detalle_servicio,
      },
    ]);

    setCargando(false);

    if (error) {
      alert("Error al crear cotización: " + error.message);
    } else {
      setNuevaCotizacion({
        cliente: "",
        obra_solicitada: "",
        fecha_evento: "",
        valor_total: "",
        detalle_servicio: "",
      });
      cargarDatos();
    }
  };

  // D. Crear Usuario y Asignar Privilegios
  const guardarUsuario = async (e) => {
    e.preventDefault();
    setCargando(true);

    const { error } = await supabase.from("usuarios").insert([nuevoUsuario]);
    setCargando(false);

    if (error) {
      alert("Error al crear usuario: " + error.message);
    } else {
      setNuevoUsuario({
        nombre: "",
        correo: "",
        password: "",
        rol: "auxiliar",
      });
      cargarDatos();
    }
  };

  // E. Eliminar registro (Solo Admin)
  const eliminarRegistro = async (tabla, id) => {
    if (!confirm("¿Seguro que deseas eliminar este registro?")) return;
    await supabase.from(tabla).delete().eq("id", id);
    cargarDatos();
  };

  // --- 7. VISTA DE LOGIN SI NO HAY SESIÓN ---
  if (!usuario) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold tracking-wider uppercase mb-3 border border-amber-500/20">
              Sistema de Gestión Teatral
            </span>
            <h1 className="text-3xl font-bold text-white">
              Grupo Artístico El Bucle
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Control de insumos, nómina de actores y cotizaciones
            </p>
          </div>

          <form onSubmit={iniciarSesion} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={correoLogin}
                onChange={(e) => setCorreoLogin(e.target.value)}
                placeholder="admin@elbucle.com"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={passwordLogin}
                onChange={(e) => setPasswordLogin(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {errorLogin && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {errorLogin}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition cursor-pointer"
            >
              {cargando ? "Verificando..." : "Iniciar Sesión"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">
              Accesos rápidos de prueba:
            </p>
            <p>
              • <strong>Admin:</strong> admin@elbucle.com / admin123
            </p>
            <p>
              • <strong>Auxiliar:</strong> auxiliar@elbucle.com / auxiliar123
            </p>
          </div>
        </div>
      </div>
    );
  }

  const esAdmin = usuario.rol === "admin";
  const totalCompras = compras.reduce((acc, c) => acc + Number(c.monto || 0), 0);
  const totalPagos = pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0);

  // --- 8. VISTA DE IMPRESIÓN DE COTIZACIÓN (MODO PDF) ---
  if (cotizacionImprimir) {
    return (
      <div className="min-h-screen bg-white text-slate-900 p-10 max-w-3xl mx-auto">
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold uppercase tracking-tight">
              Grupo Artístico El Bucle
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Producción Escénica, Teatro y Eventos Culturales
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold uppercase bg-slate-200 px-3 py-1 rounded">
              Cotización Oficial #{cotizacionImprimir.id}
            </span>
            <p className="text-xs text-slate-500 mt-2">
              Fecha de emisión:{" "}
              {new Date(cotizacionImprimir.creado_en).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
          <div>
            <p className="text-xs uppercase text-slate-500 font-bold">
              Cliente / Entidad
            </p>
            <p className="text-lg font-bold">{cotizacionImprimir.cliente}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500 font-bold">
              Obra o Espectáculo
            </p>
            <p className="text-lg font-bold">
              {cotizacionImprimir.obra_solicitada}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500 font-bold">
              Fecha Programada del Evento
            </p>
            <p className="text-sm font-medium">
              {cotizacionImprimir.fecha_evento || "Por definir"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500 font-bold">
              Valor Total Cotizado
            </p>
            <p className="text-2xl font-extrabold text-amber-600">
              ${Number(cotizacionImprimir.valor_total).toLocaleString("es-CO")}{" "}
              COP
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase text-slate-700 mb-2">
            Alcance y Detalle Técnico / Artístico del Servicio
          </h3>
          <div className="p-5 border border-slate-200 rounded-xl whitespace-pre-wrap text-sm leading-relaxed">
            {cotizacionImprimir.detalle_servicio}
          </div>
        </div>

        <div className="flex gap-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="px-6 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-lg cursor-pointer"
          >
            Imprimir / Guardar como PDF
          </button>
          <button
            onClick={() => setCotizacionImprimir(null)}
            className="px-6 py-2.5 bg-slate-200 text-slate-800 font-semibold rounded-lg cursor-pointer"
          >
            Volver al Panel
          </button>
        </div>
      </div>
    );
  }

  // --- 9. PANEL PRINCIPAL DEL SISTEMA ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Barra Superior */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            🎭 Grupo Artístico El Bucle
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                esAdmin
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
              }`}
            >
              Rol: {usuario.rol}
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Sesión activa: {usuario.nombre} ({usuario.correo})
          </p>
        </div>

        <button
          onClick={cerrarSesion}
          className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-red-500/20 hover:text-red-300 border border-slate-700 rounded-lg transition cursor-pointer"
        >
          Cerrar Sesión
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Tarjetas de Resumen Financiero */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <p className="text-xs text-slate-400 uppercase">
              Total Compras e Insumos
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              ${totalCompras.toLocaleString("es-CO")}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {compras.length} facturas registradas
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <p className="text-xs text-slate-400 uppercase">
              Total Pagado a Actores
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              ${totalPagos.toLocaleString("es-CO")}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {pagos.length} pagos liquidados
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <p className="text-xs text-slate-400 uppercase">
              Cotizaciones Emitidas
            </p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {cotizaciones.length} Obras
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {esAdmin
                ? "Acceso completo a cotizaciones"
                : "Módulo exclusivo de administración"}
            </p>
          </div>
        </div>

        {/* Navegación de Módulos según Privilegios */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-800 pb-4">
          <button
            onClick={() => setPestanaActiva("compras")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
              pestanaActiva === "compras"
                ? "bg-amber-500 text-slate-950"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            📦 Facturas y Compras de Insumos
          </button>

          <button
            onClick={() => setPestanaActiva("actores")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
              pestanaActiva === "actores"
                ? "bg-amber-500 text-slate-950"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            🎭 Pago a Actores {esAdmin ? "(Gestión)" : "(Solo Consulta)"}
          </button>

          {esAdmin && (
            <>
              <button
                onClick={() => setPestanaActiva("cotizaciones")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  pestanaActiva === "cotizaciones"
                    ? "bg-amber-500 text-slate-950"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                📄 Cotizaciones de Obras
              </button>

              <button
                onClick={() => setPestanaActiva("usuarios")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  pestanaActiva === "usuarios"
                    ? "bg-amber-500 text-slate-950"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                🔐 Usuarios y Privilegios
              </button>
            </>
          )}
        </div>

        {/* MÓDULO 1: COMPRAS Y FACTURAS (Ambos roles pueden subir facturas) */}
        {pestanaActiva === "compras" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form
              onSubmit={guardarCompra}
              className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 h-fit"
            >
              <h2 className="text-lg font-bold text-white">
                Subir Factura / Compra de Insumo
              </h2>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Fecha de compra
                </label>
                <input
                  type="date"
                  required
                  value={nuevaCompra.fecha}
                  onChange={(e) =>
                    setNuevaCompra({ ...nuevaCompra, fecha: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Proveedor / Almacén
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ferretería Central / Telas Bogotá"
                  value={nuevaCompra.proveedor}
                  onChange={(e) =>
                    setNuevaCompra({
                      ...nuevaCompra,
                      proveedor: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Categoría del Insumo
                </label>
                <select
                  value={nuevaCompra.categoria}
                  onChange={(e) =>
                    setNuevaCompra({
                      ...nuevaCompra,
                      categoria: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                >
                  <option value="Escenografía">Escenografía</option>
                  <option value="Vestuario y Maquillaje">
                    Vestuario y Maquillaje
                  </option>
                  <option value="Iluminación y Sonido">
                    Iluminación y Sonido
                  </option>
                  <option value="Utilería">Utilería</option>
                  <option value="Transporte y Logística">
                    Transporte y Logística
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Valor Total (COP)
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ej. 85000"
                  value={nuevaCompra.monto}
                  onChange={(e) =>
                    setNuevaCompra({ ...nuevaCompra, monto: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Descripción de los insumos comprados
                </label>
                <textarea
                  rows="2"
                  required
                  placeholder="Detalle qué se compró y para qué obra..."
                  value={nuevaCompra.descripcion}
                  onChange={(e) =>
                    setNuevaCompra({
                      ...nuevaCompra,
                      descripcion: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Soporte de Factura (Foto o PDF)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setArchivoFactura(e.target.files[0])}
                  className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-amber-400 hover:file:bg-slate-700"
                />
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm cursor-pointer"
              >
                {cargando ? "Guardando..." : "Registrar Compra y Factura"}
              </button>
            </form>

            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl overflow-x-auto">
              <h2 className="text-lg font-bold text-white mb-4">
                Historial de Facturas e Insumos
              </h2>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                    <th className="py-3 px-2">Fecha</th>
                    <th className="py-3 px-2">Proveedor / Categoría</th>
                    <th className="py-3 px-2">Descripción</th>
                    <th className="py-3 px-2">Monto</th>
                    <th className="py-3 px-2">Soporte</th>
                    {esAdmin && <th className="py-3 px-2">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {compras.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 px-2 whitespace-nowrap text-xs text-slate-300">
                        {c.fecha}
                      </td>
                      <td className="py-3 px-2">
                        <p className="font-semibold text-white">{c.proveedor}</p>
                        <span className="text-xs text-amber-400">
                          {c.categoria}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-xs text-slate-300">
                        {c.descripcion}
                      </td>
                      <td className="py-3 px-2 font-bold text-white">
                        ${Number(c.monto).toLocaleString("es-CO")}
                      </td>
                      <td className="py-3 px-2">
                        {c.archivo_url ? (
                          <a
                            href={c.archivo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-sky-400 underline"
                          >
                            Ver Factura
                          </a>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Sin archivo
                          </span>
                        )}
                      </td>
                      {esAdmin && (
                        <td className="py-3 px-2">
                          <button
                            onClick={() =>
                              eliminarRegistro("compras_insumos", c.id)
                            }
                            className="text-xs text-red-400 hover:underline cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {compras.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        className="py-6 text-center text-slate-500"
                      >
                        Aún no hay facturas registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MÓDULO 2: PAGO A ACTORES (Admin registra, Auxiliar solo consulta) */}
        {pestanaActiva === "actores" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {esAdmin ? (
              <form
                onSubmit={guardarPagoActor}
                className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 h-fit"
              >
                <h2 className="text-lg font-bold text-white">
                  Registrar Pago a Actor / Artista
                </h2>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Nombre del Actor / Integrante
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre completo"
                    value={nuevoPago.actor}
                    onChange={(e) =>
                      setNuevoPago({ ...nuevoPago, actor: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Obra o Proyecto Teatral
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre de la obra"
                    value={nuevoPago.obra}
                    onChange={(e) =>
                      setNuevoPago({ ...nuevoPago, obra: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Motivo / Concepto del Pago (Por qué se pagó)
                  </label>
                  <textarea
                    rows="2"
                    required
                    placeholder="Ej. Pago por 2 funciones de fin de semana y montaje escénico"
                    value={nuevoPago.concepto}
                    onChange={(e) =>
                      setNuevoPago({ ...nuevoPago, concepto: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Fecha del Pago
                  </label>
                  <input
                    type="date"
                    required
                    value={nuevoPago.fecha}
                    onChange={(e) =>
                      setNuevoPago({ ...nuevoPago, fecha: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Valor Pagado (COP)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Ej. 250000"
                    value={nuevoPago.monto}
                    onChange={(e) =>
                      setNuevoPago({ ...nuevoPago, monto: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-sm cursor-pointer"
                >
                  Registrar Pago a Actor
                </button>
              </form>
            ) : (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl h-fit">
                <h2 className="text-lg font-bold text-white mb-2">
                  Modo de Consulta Operativa
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tu perfil de <strong>Auxiliar</strong> tiene permisos para
                  visualizar el historial de pagos realizados a los actores y su
                  respectivo concepto, pero la creación o eliminación de nómina
                  está reservada al perfil Administrador.
                </p>
              </div>
            )}

            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl overflow-x-auto">
              <h2 className="text-lg font-bold text-white mb-4">
                Registro Histórico de Pagos a Actores
              </h2>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                    <th className="py-3 px-2">Fecha</th>
                    <th className="py-3 px-2">Actor / Obra</th>
                    <th className="py-3 px-2">Concepto (Por qué se pagó)</th>
                    <th className="py-3 px-2">Monto</th>
                    {esAdmin && <th className="py-3 px-2">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {pagos.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 px-2 text-xs text-slate-300">
                        {p.fecha}
                      </td>
                      <td className="py-3 px-2">
                        <p className="font-semibold text-white">{p.actor}</p>
                        <span className="text-xs text-emerald-400">
                          Obra: {p.obra}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-xs text-slate-300">
                        {p.concepto}
                      </td>
                      <td className="py-3 px-2 font-bold text-emerald-400">
                        ${Number(p.monto).toLocaleString("es-CO")}
                      </td>
                      {esAdmin && (
                        <td className="py-3 px-2">
                          <button
                            onClick={() =>
                              eliminarRegistro("pagos_actores", p.id)
                            }
                            className="text-xs text-red-400 hover:underline cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {pagos.length === 0 && (
                    <tr>
                      <td
                        colSpan="5"
                        className="py-6 text-center text-slate-500"
                      >
                        No hay pagos a actores registrados todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MÓDULO 3: COTIZACIONES DE OBRAS (Exclusivo Admin) */}
        {esAdmin && pestanaActiva === "cotizaciones" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form
              onSubmit={guardarCotizacion}
              className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 h-fit"
            >
              <h2 className="text-lg font-bold text-white">
                Nueva Cotización de Obra
              </h2>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Cliente / Entidad Solicitante
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Alcaldía / Colegio / Festival"
                  value={nuevaCotizacion.cliente}
                  onChange={(e) =>
                    setNuevaCotizacion({
                      ...nuevaCotizacion,
                      cliente: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Obra o Servicio Solicitado
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nombre del espectáculo"
                  value={nuevaCotizacion.obra_solicitada}
                  onChange={(e) =>
                    setNuevaCotizacion({
                      ...nuevaCotizacion,
                      obra_solicitada: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Fecha Estimada de la Función
                </label>
                <input
                  type="date"
                  required
                  value={nuevaCotizacion.fecha_evento}
                  onChange={(e) =>
                    setNuevaCotizacion({
                      ...nuevaCotizacion,
                      fecha_evento: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Valor Total Cotizado (COP)
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ej. 2500000"
                  value={nuevaCotizacion.valor_total}
                  onChange={(e) =>
                    setNuevaCotizacion({
                      ...nuevaCotizacion,
                      valor_total: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Detalle de lo que incluye la cotización
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Incluye 6 actores en escena, escenografía completa, sonido, luces y transporte..."
                  value={nuevaCotizacion.detalle_servicio}
                  onChange={(e) =>
                    setNuevaCotizacion({
                      ...nuevaCotizacion,
                      detalle_servicio: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm cursor-pointer"
              >
                Generar Cotización
              </button>
            </form>

            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl overflow-x-auto">
              <h2 className="text-lg font-bold text-white mb-4">
                Cotizaciones Generadas
              </h2>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                    <th className="py-3 px-2">Cliente / Obra</th>
                    <th className="py-3 px-2">Fecha Evento</th>
                    <th className="py-3 px-2">Detalle</th>
                    <th className="py-3 px-2">Valor</th>
                    <th className="py-3 px-2">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {cotizaciones.map((cot) => (
                    <tr key={cot.id}>
                      <td className="py-3 px-2">
                        <p className="font-semibold text-white">
                          {cot.cliente}
                        </p>
                        <span className="text-xs text-amber-400">
                          {cot.obra_solicitada}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-xs text-slate-300">
                        {cot.fecha_evento}
                      </td>
                      <td className="py-3 px-2 text-xs text-slate-300 max-w-xs">
                        {cot.detalle_servicio}
                      </td>
                      <td className="py-3 px-2 font-bold text-white">
                        ${Number(cot.valor_total).toLocaleString("es-CO")}
                      </td>
                      <td className="py-3 px-2 space-x-3 whitespace-nowrap">
                        <button
                          onClick={() => setCotizacionImprimir(cot)}
                          className="text-xs text-amber-400 hover:underline font-semibold cursor-pointer"
                        >
                          Imprimir / PDF
                        </button>
                        <button
                          onClick={() =>
                            eliminarRegistro("cotizaciones", cot.id)
                          }
                          className="text-xs text-red-400 hover:underline cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cotizaciones.length === 0 && (
                    <tr>
                      <td
                        colSpan="5"
                        className="py-6 text-center text-slate-500"
                      >
                        No hay cotizaciones creadas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MÓDULO 4: GESTIÓN DE USUARIOS Y PRIVILEGIOS (Exclusivo Admin) */}
        {esAdmin && pestanaActiva === "usuarios" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form
              onSubmit={guardarUsuario}
              className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 h-fit"
            >
              <h2 className="text-lg font-bold text-white">
                Crear Usuario y Asignar Privilegios
              </h2>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Nombre del Integrante
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Laura Gómez"
                  value={nuevoUsuario.nombre}
                  onChange={(e) =>
                    setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Correo de Acceso
                </label>
                <input
                  type="email"
                  required
                  placeholder="laura@elbucle.com"
                  value={nuevoUsuario.correo}
                  onChange={(e) =>
                    setNuevoUsuario({ ...nuevoUsuario, correo: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Contraseña Asignada
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contraseña de ingreso"
                  value={nuevoUsuario.password}
                  onChange={(e) =>
                    setNuevoUsuario({
                      ...nuevoUsuario,
                      password: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Nivel de Privilegio (Rol)
                </label>
                <select
                  value={nuevoUsuario.rol}
                  onChange={(e) =>
                    setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                >
                  <option value="auxiliar">
                    Auxiliar (Subir facturas y ver pagos)
                  </option>
                  <option value="admin">
                    Administrador (Control total y cotizaciones)
                  </option>
                </select>
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm cursor-pointer"
              >
                Crear Usuario
              </button>
            </form>

            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl overflow-x-auto">
              <h2 className="text-lg font-bold text-white mb-4">
                Usuarios con Acceso al Sistema
              </h2>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                    <th className="py-3 px-2">Nombre</th>
                    <th className="py-3 px-2">Correo</th>
                    <th className="py-3 px-2">Privilegio (Rol)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {listaUsuarios.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3 px-2 font-semibold text-white">
                        {u.nombre}
                      </td>
                      <td className="py-3 px-2 text-slate-300">{u.correo}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                            u.rol === "admin"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-sky-500/20 text-sky-300"
                          }`}
                        >
                          {u.rol}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}