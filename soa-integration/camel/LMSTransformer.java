/**
 * Java Transformer Example for ACL
 * Transforms LMS assignments into Reminder commands
 */
package com.example.reminders.acl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.camel.Exchange;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class LMSTransformer {

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Transform LMS assignment event to Reminder creation request
     */
    public String transformToReminder(Exchange exchange) throws Exception {
        String lmsPayload = exchange.getIn().getBody(String.class);
        JsonNode lmsEvent = objectMapper.readTree(lmsPayload);

        // Extract LMS fields
        String assignmentId = lmsEvent.get("assignment_id").asText();
        String studentId = lmsEvent.get("student_id").asText();
        String title = lmsEvent.get("assignment_title").asText();
        String dueDate = lmsEvent.get("due_date").asText();
        String courseId = lmsEvent.get("course_id").asText();
        String courseName = lmsEvent.get("course_name").asText();

        // Calculate advance notification time
        // For assignments: notify 24 hours before
        int advanceMinutes = 1440; // 24 hours

        // Build internal Reminder request
        Map<String, Object> reminder = new HashMap<>();
        reminder.put("userId", mapLMSStudentToUserId(studentId));
        reminder.put("title", String.format("Assignment Due: %s", title));
        reminder.put("dueAt", dueDate);
        reminder.put("source", "LMS");
        reminder.put("advanceMinutes", advanceMinutes);

        // Metadata for traceability
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("lmsAssignmentId", assignmentId);
        metadata.put("courseId", courseId);
        metadata.put("courseName", courseName);
        metadata.put("assignmentType", lmsEvent.get("assignment_type").asText());
        reminder.put("metadata", metadata);

        // Store assignment ID for idempotency
        exchange.setProperty("lmsAssignmentId", 
            UUID.nameUUIDFromBytes(assignmentId.getBytes()).toString());

        return objectMapper.writeValueAsString(reminder);
    }

    /**
     * Transform calendar event to Reminder
     */
    public String transformWebhookToReminder(Exchange exchange) throws Exception {
        String webhookPayload = exchange.getIn().getBody(String.class);
        JsonNode webhook = objectMapper.readTree(webhookPayload);

        String eventId = webhook.get("event_id").asText();
        String userId = webhook.get("user_id").asText();
        String eventTitle = webhook.get("title").asText();
        String startTime = webhook.get("start_time").asText();

        // Notify 30 minutes before calendar events
        int advanceMinutes = 30;

        Map<String, Object> reminder = new HashMap<>();
        reminder.put("userId", userId);
        reminder.put("title", String.format("Upcoming: %s", eventTitle));
        reminder.put("dueAt", startTime);
        reminder.put("source", "LMS");
        reminder.put("advanceMinutes", advanceMinutes);

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("lmsEventId", eventId);
        metadata.put("eventType", webhook.get("event_type").asText());
        reminder.put("metadata", metadata);

        exchange.setProperty("lmsAssignmentId", 
            UUID.nameUUIDFromBytes(eventId.getBytes()).toString());

        return objectMapper.writeValueAsString(reminder);
    }

    /**
     * Map LMS student ID to internal user ID
     * In production, this would query a user mapping service
     */
    private String mapLMSStudentToUserId(String lmsStudentId) {
        // TODO: Implement actual mapping logic
        // This is a placeholder that assumes direct mapping
        return String.format("user-%s", lmsStudentId);
    }
}
