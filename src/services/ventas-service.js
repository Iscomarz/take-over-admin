import supabase from '$lib/supabase';

function parseMoney(value) {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    // Quita todo lo que no sea dígito, signo negativo o punto decimal
    const cleaned = String(value).replace(/[^0-9.-]+/g, '');
    const n = parseFloat(cleaned);
    return Number.isNaN(n) ? 0 : n;
}

//Ventas del dia
export async function obtenerVentasDelDia() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Establecer al inicio del día
    const mañana = new Date(hoy);
    mañana.setDate(hoy.getDate() + 1); // Establecer al inicio del día siguiente
    const { data, error } = await supabase
        .from('mVenta')
        .select('*, mPago(*)')
        .gte('fechaVenta', hoy.toISOString())
        .lt('fechaVenta', mañana.toISOString());
    if (error) {
        console.error('Error al obtener ventas del día:', error);
        return [];
    }

    //console.log('Ventas del día:', data);

    const totalVentas = data.length;
    const montoTotal = data.reduce((total, venta) => {
        const cantidad = parseMoney(venta.mPago?.cantidad);

        return total + cantidad;
    }, 0);

    //console.log('Total ventas:', totalVentas);
    //console.log('Monto total:', montoTotal);

    return { totalVentas, montoTotal };
}

// Ventas totales por evento activo
export async function obtenerVentasPorEventoActivo() {
    //Obtener evento activo
    const eventoActivo = await obtenerEventoActivo();
    if(!eventoActivo.idevento) {
        console.error('No hay evento activo');
        return [];
    }

    const { data, error } = await supabase
        .rpc('ventas_por_fase', { evento_id: eventoActivo.idevento })

    if (error) {
        console.error(error)
        return [];
    } 

    const fases = Array.isArray(data) ? data : [];
    const result = fases.reduce(
        (acc, f) => {
            const cantidad = Number(f.cantidad) || 0;
            const monto = Number(f.monto) || 0;
            acc.totalTickets += cantidad;
            acc.totalMonto += monto;
            acc.fases.push({ nombre_fase: f.nombre_fase, cantidad, monto });
            return acc;
        },
        { totalTickets: 0, totalMonto: 0, fases: [] }
    );

    console.log(result)

    return result;
}

// Evento Activo
export async function obtenerEventoActivo() {
    const { data, error } = await supabase
        .from('mEvento')
        .select('idevento')
        .eq('activo', true)
        .single();
    if (error) {
        console.error('Error al obtener evento activo:', error);
        return null;
    }
    return data;
}

