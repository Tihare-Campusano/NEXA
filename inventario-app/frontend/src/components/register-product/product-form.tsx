import { useState } from "react";
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonInput, IonButton, IonItem, IonLabel, IonSelect, IonSelectOption, IonToast } from "@ionic/react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_KEY!
);

export default function NuevoProducto() {
    const [codigoBarra, setCodigoBarra] = useState("");
    const [producto, setProducto] = useState<any>({});
    const [categorias, setCategorias] = useState<any[]>([]);
    const [mensaje, setMensaje] = useState("");

    // Buscar producto por código de barras
    const buscarProducto = async (codigo: string) => {
        const { data } = await supabase
            .from("productos")
            .select("*")
            .eq("codigo_barra", codigo)
            .single();

        if (data) {
            // Producto encontrado → autocompletar
            setProducto(data);
            setMensaje("Producto encontrado y cargado automáticamente.");
        } else {
            // Nuevo producto
            setProducto({ codigo_barra: codigo });
            setMensaje("No existe un producto con ese código, completa los datos.");
        }
    };

    // Calcular disponibilidad según stock
    const calcularDisponibilidad = (stock: number) => {
        if (stock <= 5) return "Baja";
        if (stock <= 15) return "Media";
        return "Alta";
    };

    // Guardar producto
    const guardarProducto = async () => {
        if (!producto.nombre || !producto.codigo_barra) {
            setMensaje("Por favor, ingresa los datos mínimos requeridos.");
            return;
        }

        const { data: existente } = await supabase
            .from("productos")
            .select("id")
            .eq("codigo_barra", producto.codigo_barra)
            .single();

        if (existente) {
            // Si ya existe, actualizar stock
            const { data: stockActual } = await supabase
                .from("stock")
                .select("cantidad")
                .eq("producto_id", existente.id)
                .single();

            const nuevoStock = (stockActual?.cantidad || 0) + 1;
            const disponibilidad = calcularDisponibilidad(nuevoStock);

            await supabase
                .from("stock")
                .update({
                    cantidad: nuevoStock,
                    disponibilidad,
                    ultima_actualizacion: new Date().toISOString(),
                })
                .eq("producto_id", existente.id);

            setMensaje("Stock actualizado correctamente.");
        } else {
            // Si no existe, crear nuevo producto y registro de stock
            const { data: nuevo } = await supabase
                .from("productos")
                .insert({
                    codigo_barra: producto.codigo_barra,
                    nombre: producto.nombre,
                    marca: producto.marca,
                    modelo: producto.modelo,
                    compatible: producto.compatible,
                    categoria_id: producto.categoria_id,
                    activo: true,
                    creado_en: new Date().toISOString(),
                })
                .select()
                .single();

            await supabase.from("stock").insert({
                producto_id: nuevo.id,
                cantidad: 1,
                disponibilidad: "Baja",
                ultima_actualizacion: new Date().toISOString(),
            });

            setMensaje("Producto registrado correctamente.");
        }
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar color="primary">
                    <IonTitle>Registrar Producto</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding space-y-4">
                <IonItem>
                    <IonLabel position="floating">Código de Barras</IonLabel>
                    <IonInput
                        value={codigoBarra}
                        onIonChange={(e) => setCodigoBarra(e.detail.value!)}
                        onIonBlur={() => buscarProducto(codigoBarra)}
                    />
                </IonItem>

                <IonItem>
                    <IonLabel position="floating">Nombre</IonLabel>
                    <IonInput
                        value={producto.nombre || ""}
                        onIonChange={(e) =>
                            setProducto({ ...producto, nombre: e.detail.value })
                        }
                    />
                </IonItem>

                <IonItem>
                    <IonLabel position="floating">Marca</IonLabel>
                    <IonInput
                        value={producto.marca || ""}
                        onIonChange={(e) =>
                            setProducto({ ...producto, marca: e.detail.value })
                        }
                    />
                </IonItem>

                <IonItem>
                    <IonLabel position="floating">Modelo</IonLabel>
                    <IonInput
                        value={producto.modelo || ""}
                        onIonChange={(e) =>
                            setProducto({ ...producto, modelo: e.detail.value })
                        }
                    />
                </IonItem>

                <IonButton expand="block" color="success" onClick={guardarProducto}>
                    Guardar Producto
                </IonButton>

                <IonToast
                    isOpen={!!mensaje}
                    message={mensaje}
                    duration={2500}
                    onDidDismiss={() => setMensaje("")}
                />
            </IonContent>
        </IonPage>
    );
}