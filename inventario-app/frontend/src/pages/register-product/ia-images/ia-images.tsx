// --- 1. IMPORTACIONES ---
// Importamos los componentes de la interfaz de usuario de Ionic (botones, imágenes, spinners, etc.).
import {
    IonPage,
    IonContent,
    IonButton,
    IonImg,
    IonText,
    IonLoading,
} from "@ionic/react";
// Importamos los 'hooks' de React para manejar el estado (useState) y el ciclo de vida (useEffect).
import { useState, useEffect } from "react";
// Importamos Capacitor para acceder a funcionalidades nativas como la cámara y detectar la plataforma.
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType } from "@capacitor/camera";
// Importamos el cliente de Supabase para conectar con nuestra base de datos y almacenamiento.
import { createClient } from "@supabase/supabase-js";
// Importamos hooks de React Router para la navegación y para recibir datos de otras páginas.
import { useHistory, useLocation } from "react-router-dom";
// Importamos TensorFlow.js (tf) y la librería para modelos TFLite.
import * as tf from "@tensorflow/tfjs";
import * as tflite from "@tensorflow/tfjs-tflite";
// Importamos los "motores" (backends) de TFJS. Sin esto, la IA no puede hacer cálculos.
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-wasm';

// --- 2. CONFIGURACIÓN DE SUPABASE ---
// Creamos una instancia del cliente de Supabase para poder interactuar con nuestra base de datos.
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// --- 3. DEFINICIÓN DEL COMPONENTE ---
export default function IAImagen() {
    // --- Hooks de Navegación ---
    const history = useHistory(); // Hook para poder navegar a otras páginas (ej: volver al formulario).
    const location = useLocation(); // Hook para acceder a los datos pasados desde la página anterior.
    // Obtenemos los datos del formulario que se enviaron desde la página de registro.
    const formData = (location.state as any)?.formData || {};

    // --- 4. ESTADOS DEL COMPONENTE ---
    // 'useState' nos permite guardar información que cambia y que redibuja la pantalla cuando se actualiza.
    const [image, setImage] = useState<string | null>(null); // Guarda la URL de la imagen tomada.
    const [loading, setLoading] = useState(false); // Controla si una operación está en curso (para deshabilitar botones).
    const [estadoIA, setEstadoIA] = useState<string | null>(null); // Guarda el resultado de la predicción de la IA (ej: "Nuevo").
    const [modeloLite, setModeloLite] = useState<tflite.TFLiteModel | null>(null); // Guarda el modelo de IA una vez cargado en memoria.
    const [showLoadingOverlay, setShowLoadingOverlay] = useState(false); // Controla un indicador de carga de pantalla completa.

    // --- 5. CARGA DEL MODELO DE IA ---
    // 'useEffect' se ejecuta una sola vez cuando el componente se muestra en pantalla.
    // Es el lugar perfecto para realizar tareas de inicialización.
    useEffect(() => {
        const loadModelLite = async () => {
            setShowLoadingOverlay(true); // Muestra el indicador de carga.
            try {
                // Esperamos a que el motor de TensorFlow.js esté 100% listo. Esto previene errores.
                await tf.ready();
                console.log("✅ Backend de TensorFlow listo.");

                // Cargamos el archivo del modelo desde la carpeta 'public/ml'.
                const m = await tflite.loadTFLiteModel("../ml/modelo_final.tflite");
                
                // Guardamos el modelo cargado en nuestro estado para poder usarlo después.
                setModeloLite(m);
                console.log("✅ Modelo TFLite cargado correctamente");
            } catch (err) {
                console.error("❌ Error cargando modelo TFLite:", err);
                alert("Error al cargar el modelo de IA.");
            }
            setShowLoadingOverlay(false); // Oculta el indicador de carga.
        };
        loadModelLite();
    }, []); // El array vacío `[]` asegura que esto se ejecute solo una vez.

    // --- 6. FUNCIÓN PARA TOMAR FOTO ---
    const tomarFoto = async () => {
        try {
            // Detectamos si la app corre en un celular (nativo) o en la web.
            const isNative = Capacitor.isNativePlatform();
            
            // Llamamos al plugin de la cámara.
            const foto = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                // Optimizamos: en celular pedimos la ruta del archivo (Uri) para ahorrar memoria.
                // En la web, pedimos el DataUrl (texto base64).
                resultType: isNative ? CameraResultType.Uri : CameraResultType.DataUrl,
            });

            // Guardamos la ruta de la imagen en el estado. `webPath` funciona en ambas plataformas.
            setImage(foto.webPath || foto.dataUrl || null);
            // Limpiamos cualquier predicción anterior, ya que la foto es nueva.
            setEstadoIA(null);
        } catch {
            // Si el usuario cancela la cámara, se produce un error que capturamos aquí para evitar que la app se rompa.
            console.log("El usuario canceló la toma de la foto.");
        }
    };

    // --- 7. FUNCIÓN PARA PREDECIR CON LA IA ---
    const predecirEstadoLite = async () => {
        // No hacer nada si no tenemos un modelo cargado o una imagen para analizar.
        if (!modeloLite || !image) return;

        setLoading(true);
        setShowLoadingOverlay(true);

        // Creamos un objeto de imagen en JavaScript para que TensorFlow pueda leerlo.
        const img = new Image();
        img.src = image;

        // Esta función se ejecutará cuando la imagen se haya cargado completamente en el navegador/app.
        // ✅ --- INICIO DEL CÓDIGO ACTUALIZADO --- ✅
        img.onload = async () => {
            try {
                await tf.ready();

                const tensor = tf.browser.fromPixels(img)
                    .resizeNearestNeighbor([224, 224])
                    .toFloat().div(tf.scalar(255))
                    .expandDims(0);

                const output = (await modeloLite.predict(tensor)) as tf.Tensor;

                // --- CORRECCIÓN IMPORTANTE ---
                // Añadimos una verificación para asegurarnos de que la predicción tuvo éxito.
                if (!output) {
                    // Si output es null, lanzamos un error claro y detenemos la ejecución.
                    throw new Error("La predicción del modelo falló y devolvió un resultado nulo. Esto suele deberse a una operación no soportada en el modelo TFLite para la web.");
                }

                const scores = (await output.array()) as number[][];
                const idx = scores[0].indexOf(Math.max(...scores[0]));
                const etiquetas = ["Mal estado", "Nuevo", "Usado"];
                const resultado = etiquetas[idx] || "Desconocido";

                setEstadoIA(resultado);
                alert(`Estado detectado: ${resultado}`);

            } catch (error) {
                // Ahora, el error que lanzamos arriba será capturado aquí.
                console.error("Error al predecir:", error);
                alert("Ocurrió un error al analizar la imagen. Revisa la consola para más detalles.");
            } finally {
                setLoading(false);
                setShowLoadingOverlay(false);
            }
        };
        // ✅ --- FIN DEL CÓDIGO ACTUALIZADO --- ✅
        
        // Manejador de error por si la imagen no se puede cargar.
        img.onerror = () => {
            alert("No se pudo cargar la imagen para analizar.");
            setLoading(false);
            setShowLoadingOverlay(false);
        };
    };
    
    // ✅ NUEVO: Función para calcular la disponibilidad según las reglas especificadas.
    const calcularDisponibilidad = (cantidad: number): string => {
        if (cantidad <= 0) return "Sin stock";
        if (cantidad >= 1 && cantidad <= 4) return "Baja disponibilidad";
        if (cantidad >= 5 && cantidad <= 10) return "Disponibilidad media";
        return "Alta disponibilidad"; // Para 11 en adelante
    };

    // --- 8. FUNCIÓN PARA GUARDAR Y VOLVER AL FORMULARIO ---
    const guardarYVolver = async () => {
        // Validaciones para asegurar que tenemos toda la información necesaria.
        if (!image || !estadoIA || !formData.codigo) {
            alert("Se necesita una foto, un análisis de IA y un código de producto para continuar.");
            return;
        }

        setLoading(true);
        setShowLoadingOverlay(true);

        try {
            // Convertimos la imagen (sea Uri o DataUrl) a un formato 'blob' que Supabase puede almacenar.
            const response = await fetch(image);
            const blob = await response.blob();
            // Creamos un nombre de archivo único para evitar sobrescribir imágenes.
            const fileName = `productos/${formData.codigo}_${Date.now()}.png`;
            // Subimos el archivo 'blob' al bucket 'imagenes-productos' de Supabase Storage.
            const { error } = await supabase.storage.from("imagenes-productos").upload(fileName, blob);
            if (error) throw error; // Si hay un error, lo lanzamos para que lo capture el 'catch'.

            // Obtenemos la URL pública de la imagen que acabamos de subir.
            const { data: publicUrlData } = supabase.storage.from("imagenes-productos").getPublicUrl(fileName);

            // ✅ CORRECCIÓN: Calculamos el nuevo stock y la nueva disponibilidad aquí.
            const newStock = parseInt(formData.stock || "0", 10) + 1;
            const newDisponibilidad = calcularDisponibilidad(newStock);

            // Creamos un nuevo objeto con todos los datos del formulario anterior, más los nuevos datos de la IA.
            const updatedForm = {
                ...formData,
                imagen_url: publicUrlData.publicUrl || "", // La URL de la imagen.
                estadoIA: estadoIA, // El estado detectado.
                stock: newStock.toString(), // Enviamos el nuevo stock.
                disponibilidad: newDisponibilidad, // Enviamos la nueva disponibilidad ya calculada.
            };
            
            // Navegamos de vuelta a la página de registro, pasándole el objeto con todos los datos actualizados.
            history.push("/tabs/registro/ia", { formData: updatedForm });

        } catch (error: any) {
            alert(`Error al subir imagen: ${error.message}`);
        } finally {
            setLoading(false);
            setShowLoadingOverlay(false);
        }
    };

    // --- 9. RENDERIZADO DEL COMPONENTE (LO QUE SE VE EN PANTALLA) ---
    return (
        <IonPage>
            <IonContent className="ion-padding">
                {/* Botón para activar la cámara */}
                <IonButton expand="block" onClick={tomarFoto} disabled={loading}>Tomar Foto</IonButton>

                {/* Muestra la imagen solo si el estado 'image' tiene un valor */}
                {image && <IonImg src={image} style={{ marginTop: "1rem" }} />}
                
                {/* Muestra el botón de analizar solo si hay una imagen Y todavía no se ha analizado */}
                {image && !estadoIA && (
                    <IonButton color="secondary" expand="block" onClick={predecirEstadoLite} disabled={loading || !modeloLite} style={{ marginTop: "1rem" }}>
                        Analizar con IA
                    </IonButton>
                )}

                {/* Muestra el resultado y el botón de confirmar solo si ya hay un estado detectado por la IA */}
                {estadoIA && (
                    <>
                        <IonText><h2 style={{ textAlign: "center", marginTop: "1rem" }}>Estado: {estadoIA}</h2></IonText>
                        <IonButton color="success" expand="block" onClick={guardarYVolver} disabled={loading} style={{ marginTop: "1rem" }}>
                            Confirmar y Volver
                        </IonButton>
                    </>
                )}

                {/* Componente de Ionic que muestra una pantalla de carga completa */}
                <IonLoading isOpen={showLoadingOverlay} message={"Procesando..."} />
            </IonContent>
        </IonPage>
    );
}