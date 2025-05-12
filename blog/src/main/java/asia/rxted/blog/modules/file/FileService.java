package asia.rxted.blog.modules.file;

import org.springframework.web.multipart.MultipartFile;

public interface FileService {

    void write(MultipartFile file);

    // void read();

    // void list();

    // void search();

    // void assertAllowed(MultipartFile file, String[] allowedExtension);

}
