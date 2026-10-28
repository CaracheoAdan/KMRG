import { supabase } from '../config/supabase';

let FileSystemModule: any = null;
try {
  FileSystemModule = require('expo-file-system/legacy');
} catch {
  FileSystemModule = null;
}

/**
 * Convierte un Base64 string o data-uri a ArrayBuffer/Uint8Array
 * de forma nativa en JS sin dependencias externas pesadas.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const cleanBase64 = base64.replace(/^data:(image|audio)\/[^;]+;base64,/, '');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  let bufferLength = cleanBase64.length * 0.75;
  if (cleanBase64.endsWith('==')) bufferLength -= 2;
  else if (cleanBase64.endsWith('=')) bufferLength -= 1;

  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < cleanBase64.length; i += 4) {
    const encoded1 = lookup[cleanBase64.charCodeAt(i)];
    const encoded2 = lookup[cleanBase64.charCodeAt(i + 1)];
    const encoded3 = lookup[cleanBase64.charCodeAt(i + 2)];
    const encoded4 = lookup[cleanBase64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (cleanBase64[i + 2] !== '=') bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    if (cleanBase64[i + 3] !== '=') bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  return bytes;
}

async function uploadMediaBuffer(
  uriOrBase64: string,
  options: {
    folder: string;
    ext: 'jpg' | 'm4a';
    contentType: 'image/jpeg' | 'audio/m4a';
    dataPrefix: 'data:image/' | 'data:audio/';
  }
): Promise<string> {
  if (!uriOrBase64) return '';

  // Si ya es una URL remota de Supabase o HTTP, no es necesario volver a subirla
  if (uriOrBase64.startsWith('http://') || uriOrBase64.startsWith('https://')) {
    return uriOrBase64;
  }

  try {
    const fileName = `${options.folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${options.ext}`;
    let fileBytes: Uint8Array;

    if (uriOrBase64.startsWith(options.dataPrefix)) {
      fileBytes = base64ToUint8Array(uriOrBase64);
    } else if (
      (uriOrBase64.startsWith('file://') || uriOrBase64.startsWith('/')) &&
      FileSystemModule
    ) {
      const base64Data = await FileSystemModule.readAsStringAsync(uriOrBase64, {
        encoding: FileSystemModule.EncodingType?.Base64 || 'base64',
      });
      fileBytes = base64ToUint8Array(base64Data);
    } else {
      return uriOrBase64;
    }

    const { data, error } = await supabase.storage
      .from('kmrg-media')
      .upload(fileName, fileBytes, {
        contentType: options.contentType,
        upsert: true,
      });

    if (error) {
      console.warn('[SupabaseMediaService] Storage upload fallback a local:', error.message);
      return uriOrBase64;
    }

    if (data?.path) {
      const { data: publicUrlData } = supabase.storage
        .from('kmrg-media')
        .getPublicUrl(data.path);
      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  } catch (err) {
    console.warn('[SupabaseMediaService] Error en subida multimedia, usando fallback local:', err);
  }

  return uriOrBase64;
}

export const SupabaseMediaService = {
  /**
   * Sube una foto a Supabase Storage en el bucket 'kmrg-media'.
   * Si la subida falla (ej. sin conexión o bucket aún no provisionado),
   * retorna de forma segura la URI local o Base64 sin interrumpir la experiencia de usuario.
   */
  async uploadPhoto(
    photoUriOrBase64: string,
    folder: 'memories' | 'avatars' | 'capsules' | 'places' = 'memories'
  ): Promise<string> {
    return uploadMediaBuffer(photoUriOrBase64, {
      folder,
      ext: 'jpg',
      contentType: 'image/jpeg',
      dataPrefix: 'data:image/',
    });
  },

  /**
   * Sube una nota de voz a Supabase Storage en el bucket 'kmrg-media'.
   * Si la subida falla o no hay conexión, retorna de forma segura la URI local o Base64.
   */
  async uploadAudio(
    audioUriOrBase64: string,
    folder: string = 'audio'
  ): Promise<string> {
    return uploadMediaBuffer(audioUriOrBase64, {
      folder,
      ext: 'm4a',
      contentType: 'audio/m4a',
      dataPrefix: 'data:audio/',
    });
  },
};
