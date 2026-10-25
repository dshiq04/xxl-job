package com.xxl.job.admin.controller;

import com.xxl.job.admin.core.model.XxlJobGroup;
import com.xxl.job.admin.core.model.XxlJobUser;
import com.xxl.job.admin.dao.XxlJobGroupDao;
import com.xxl.job.admin.service.LoginService;
import com.xxl.job.admin.service.XxlJobService;
import com.xxl.job.core.biz.model.ReturnT;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * JSON API used by the new React + Ant Design admin UI.
 * The legacy FreeMarker pages and their endpoints stay untouched.
 *
 * @author xxl-job
 */
@Controller
@RequestMapping("/new-api")
public class NewUiController {

    @Resource
    private XxlJobService xxlJobService;
    @Resource
    private XxlJobGroupDao xxlJobGroupDao;

    @RequestMapping("/me")
    @ResponseBody
    public ReturnT<Map<String, Object>> me(HttpServletRequest request) {
        XxlJobUser loginUser = (XxlJobUser) request.getAttribute(LoginService.LOGIN_IDENTITY_KEY);
        Map<String, Object> user = new HashMap<String, Object>();
        user.put("id", loginUser.getId());
        user.put("username", loginUser.getUsername());
        user.put("role", loginUser.getRole());
        user.put("permission", loginUser.getPermission());
        return new ReturnT<Map<String, Object>>(user);
    }

    @RequestMapping("/dashboard")
    @ResponseBody
    public ReturnT<Map<String, Object>> dashboard() {
        return new ReturnT<Map<String, Object>>(xxlJobService.dashboardInfo());
    }

    @RequestMapping("/chart")
    @ResponseBody
    public ReturnT<Map<String, Object>> chart(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") Date startDate,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") Date endDate) {
        if (startDate == null) {
            Calendar calendar = Calendar.getInstance();
            calendar.add(Calendar.DAY_OF_MONTH, -7);
            startDate = calendar.getTime();
        }
        if (endDate == null) {
            endDate = new Date();
        }
        return xxlJobService.chartInfo(startDate, endDate);
    }

    @RequestMapping("/groups")
    @ResponseBody
    public ReturnT<List<XxlJobGroup>> groups(HttpServletRequest request) {
        List<XxlJobGroup> groupList = JobInfoController.filterJobGroupByRole(request, xxlJobGroupDao.findAll());
        return new ReturnT<List<XxlJobGroup>>(groupList);
    }

}
