package com.threadwork.model;
import java.util.List;

public record PackingRequest(List<String> occasions,String season,boolean requireLayer) {}
