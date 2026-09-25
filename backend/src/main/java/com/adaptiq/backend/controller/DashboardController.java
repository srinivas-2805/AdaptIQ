package com.adaptiq.backend.controller;

import com.adaptiq.backend.dto.InterviewDtos.DashboardItem;
import com.adaptiq.backend.dto.InterviewDtos.DashboardTrendDto;
import com.adaptiq.backend.model.User;
import com.adaptiq.backend.service.InterviewService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final InterviewService interviewService;

    public DashboardController(InterviewService interviewService) {
        this.interviewService = interviewService;
    }

    @GetMapping
    public List<DashboardItem> dashboard(@AuthenticationPrincipal User user) {
        return interviewService.dashboard(user);
    }

    @GetMapping("/trends")
    public DashboardTrendDto trends(@AuthenticationPrincipal User user) {
        return interviewService.dashboardTrends(user);
    }
}
