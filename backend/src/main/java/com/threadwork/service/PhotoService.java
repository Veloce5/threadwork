package com.threadwork.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/** Private local upload directory; only checked PNG and JPEG images are served. */
@Service
public class PhotoService {
    private static final long MAX_BYTES=4L*1024*1024;
    private final Path directory;
    public record Photo(byte[] bytes, MediaType type) {}

    public PhotoService(@Value("${threadwork.upload-dir:./data/photos}") String path) {
        directory=Path.of(path).toAbsolutePath().normalize();
    }
    public String store(MultipartFile file) throws IOException {
        if(file==null || file.isEmpty() || file.getSize()>MAX_BYTES)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Upload a nonempty image under 4 MB.");
        byte[] bytes=file.getBytes();
        String extension = extension(bytes);
        if(extension==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Only valid PNG and JPEG images are supported.");
        var decoded=ImageIO.read(new ByteArrayInputStream(bytes));
        if(decoded==null || decoded.getWidth()<1 || decoded.getHeight()<1 ||
           decoded.getWidth()>5000 || decoded.getHeight()>5000 ||
           (long)decoded.getWidth()*decoded.getHeight()>20_000_000L)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Image dimensions are unsupported.");
        String stored=UUID.randomUUID()+extension;
        Files.createDirectories(directory);
        Files.write(directory.resolve(stored),bytes,StandardOpenOption.CREATE_NEW);
        return stored;
    }
    public Photo read(String stored) throws IOException {
        if(!safe(stored)) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"No photo attached.");
        Path image=directory.resolve(stored);
        if(!Files.isRegularFile(image)) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Photo not found.");
        return new Photo(Files.readAllBytes(image),stored.endsWith(".png")?MediaType.IMAGE_PNG:MediaType.IMAGE_JPEG);
    }
    public void delete(String stored) {
        if(safe(stored)) {
            try { Files.deleteIfExists(directory.resolve(stored)); } catch(IOException ignored) {}
        }
    }
    private static boolean safe(String s) {
        return s!=null && s.matches("[0-9a-fA-F-]{36}\\.(png|jpg)");
    }
    private static String extension(byte[] b) {
        if(b.length>=8 && (b[0]&255)==137 && b[1]==80 && b[2]==78 && b[3]==71 &&
           b[4]==13 && b[5]==10 && b[6]==26 && b[7]==10) return ".png";
        if(b.length>=3 && (b[0]&255)==255 && (b[1]&255)==216 && (b[2]&255)==255) return ".jpg";
        return null;
    }
}
