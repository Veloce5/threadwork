package com.threadwork.config;

import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Turns validation and malformed-JSON failures into short, readable messages. */
@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String,Object>> invalid(MethodArgumentNotValidException e){
        String message=e.getBindingResult().getFieldErrors().stream()
            .map(f->f.getField()+" "+f.getDefaultMessage()).distinct().sorted()
            .collect(Collectors.joining("; "));
        return body(message.isBlank()?"Some fields are invalid.":message);
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String,Object>> unreadable(HttpMessageNotReadableException e){
        return body("The request could not be read. Check dates, numbers and required fields.");
    }
    private static ResponseEntity<Map<String,Object>> body(String message){
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of("status",400,"error","Bad Request","message",message));
    }
}
