import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';

export type AppPermissionStatus = 'granted' | 'denied' | 'prompt';
export type PermissionType = 'camera' | 'storage';

const mapCapacitorStatus = (status: string | undefined): AppPermissionStatus => {
    switch (status) {
        case 'granted':
            return 'granted';
        case 'denied':
            return 'denied';
        default:
            return 'prompt';
    }
};

export const usePermissionManager = () => {
    const [cameraStatus, setCameraStatus] = useState<AppPermissionStatus>('prompt');
    const [storageStatus, setStorageStatus] = useState<AppPermissionStatus>('prompt');
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Verifica el estado actual de un permiso específico.
     */
    const checkPermissionStatus = useCallback(async (type: PermissionType): Promise<AppPermissionStatus> => {
        try {
            if (type === 'camera') {
                const result = await Camera.checkPermissions();
                const mapped = mapCapacitorStatus(result.camera);
                setCameraStatus(mapped);
                return mapped;
            }

            if (type === 'storage') {
                const result = await Filesystem.checkPermissions();
                const mapped = mapCapacitorStatus(result.publicStorage);
                setStorageStatus(mapped);
                return mapped;
            }

            return 'prompt';
        } catch (err) {
            console.warn('Error al verificar permisos:', err);
            const defaultStatus = Capacitor.isNativePlatform() ? 'prompt' : 'granted';
            if (type === 'camera') setCameraStatus(defaultStatus);
            if (type === 'storage') setStorageStatus(defaultStatus);
            return defaultStatus;
        }
    }, []);

    /**
     * Solicita un permiso específico.
     */
    const requestPermission = useCallback(async (type: PermissionType): Promise<AppPermissionStatus> => {
        setIsLoading(true);
        try {
            if (type === 'camera') {
                const result = await Camera.requestPermissions();
                const mapped = mapCapacitorStatus(result.camera);
                setCameraStatus(mapped);
                setIsLoading(false);
                return mapped;
            }

            if (type === 'storage') {
                const result = await Filesystem.requestPermissions();
                const mapped = mapCapacitorStatus(result.publicStorage);
                setStorageStatus(mapped);
                setIsLoading(false);
                return mapped;
            }

            setIsLoading(false);
            return 'prompt';
        } catch (err) {
            console.error(`Error al solicitar permisos de ${type}:`, err);
            setIsLoading(false);
            return 'denied';
        }
    }, []);

    useEffect(() => {
        checkPermissionStatus('camera');
        if (Capacitor.getPlatform() === 'android') {
            checkPermissionStatus('storage');
        } else {
            setStorageStatus('granted');
        }
    }, [checkPermissionStatus]);

    return {
        cameraStatus,
        storageStatus,
        isLoading,
        checkPermissionStatus,
        requestPermission,
    };
};

export default usePermissionManager;