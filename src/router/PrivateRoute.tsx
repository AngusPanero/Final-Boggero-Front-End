import { useEffect, useState, type ReactNode } from "react";
import axios from "axios";
import { UseSession } from "../contexts/SessionContext.js";
import Error from "../processMessages/Error.js";
import Loader from "../loader/Loader.js";


interface PrivateRouteProps {
    children: ReactNode;
    adminOnly?: boolean;
}

// Esto es solo UX: la protección real está en el backend (adminMiddleware en cada ruta admin).
const PrivateRoute = ({ children, adminOnly = false }: PrivateRouteProps) => {
    const { user, loading } = UseSession();
    const [status, setStatus] = useState<string>("loading");

    useEffect(() => {
        if (loading) return;

        if (!user) {
            setStatus("unauth");
            return;
        }

        // Si cambia el usuario o la ruta, vuelvo a verificar desde cero (no muestro el estado viejo)
        setStatus("loading");

        let cancelled = false;

        const verifyAccess = async () => {
            try {
                // Corte rápido con lo que ya tengo en memoria: un no-admin ni siquiera llama a la API
                if (adminOnly && user.admin !== true) {
                    setStatus("no-admin");
                    return;
                }

                const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/me`, {
                    withCredentials: true
                });

                if (cancelled) return;

                // Confirmo el rol con lo que devuelve el servidor, no con el estado local
                if (adminOnly && data?.user?.admin !== true) {
                    setStatus("no-admin");
                    return;
                }

                setStatus("ok");
            } catch (error: any) {
                if (cancelled) return;
                if (error.response?.status === 403) {
                    setStatus("banned");
                } else {
                    setStatus("unauth"); // Cookie vencida, inexistente o inválida
                }
            }
        };

        verifyAccess();

        return () => { cancelled = true; };
    }, [user, loading, adminOnly]);

    if (loading || status === "loading") {
        return <Loader />;
    }

    if (status === "no-admin") {
        return <Error errorMessage={"Acceso Restringido: Se requieren permisos de Administrador."} />;
    }

    if (status === "banned") {
        return <Error errorMessage={"Usuario Baneado, contactate con Boggero Propiedades."} />;
    }

    if (status === "unauth" || !user) {
        return <Error errorMessage={"Sesión vencida o no autorizada, por favor iniciá sesión."} />;
    }

    // Solo si todo está OK, renderizamos los children (el dashboard o la vista protegida)
    return status === "ok" ? <>{children}</> : null;
};

export default PrivateRoute;