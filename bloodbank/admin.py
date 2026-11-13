from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import (
    UserProfile, DonorProfile, Hospital, BloodInventory,
    BloodRequest, DonationCamp, CampRegistration, BloodDonationRecord
)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'phone', 'city', 'district', 'created_at')
    list_filter = ('role', 'district')
    search_fields = ('user__username', 'user__email', 'phone', 'city')


@admin.register(DonorProfile)
class DonorProfileAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'blood_group', 'age', 'gender', 'phone', 'city', 'verified', 'is_available', 'total_donations', 'last_donation_date')
    list_filter = ('verified', 'blood_group', 'is_available', 'gender', 'city')
    search_fields = ('full_name', 'phone', 'email', 'city', 'address')
    list_editable = ('verified', 'is_available')
    actions = ['verify_donors', 'unverify_donors', 'make_available', 'make_unavailable', 'delete_selected']

    def make_available(self, request, queryset):
        queryset.update(is_available=True)
    make_available.short_description = "Mark selected donors as Available"

    def make_unavailable(self, request, queryset):
        queryset.update(is_available=False)
    make_unavailable.short_description = "Mark selected donors as Unavailable"

    def verify_donors(self, request, queryset):
        count = queryset.update(verified=True)
        self.message_user(request, f"{count} donor(s) medically verified.")
    verify_donors.short_description = "Verify selected donors"

    def unverify_donors(self, request, queryset):
        count = queryset.update(verified=False)
        self.message_user(request, f"{count} donor(s) marked as Unverified (Pending Review).")
    unverify_donors.short_description = "Mark selected donors as Unverified / Pending"


@admin.register(Hospital)
class HospitalAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'locality', 'beds', 'verified_inside_geofence', 'has_blood_bank', 'blood_bank_status', 'available_units', 'phone')
    list_filter = ('verified_inside_geofence', 'category', 'has_blood_bank', 'locality')
    search_fields = ('name', 'locality', 'address', 'phone')
    list_editable = ('verified_inside_geofence',)
    actions = ['approve_hospitals', 'suspend_hospitals', 'delete_selected']

    def approve_hospitals(self, request, queryset):
        count = queryset.update(verified_inside_geofence=True)
        self.message_user(request, f"{count} healthcare facility(s) approved and accredited.")
    approve_hospitals.short_description = "Approve & Accredit selected facilities"

    def suspend_hospitals(self, request, queryset):
        count = queryset.update(verified_inside_geofence=False)
        self.message_user(request, f"{count} healthcare facility(s) suspended / marked pending.")
    suspend_hospitals.short_description = "Suspend / Mark selected facilities as Pending"


@admin.register(BloodInventory)
class BloodInventoryAdmin(admin.ModelAdmin):
    list_display = ('blood_group', 'units', 'optimal', 'critical', 'red_cells', 'platelets', 'plasma', 'status_level', 'last_updated')
    list_editable = ('units', 'red_cells', 'platelets', 'plasma')
    ordering = ('blood_group',)


@admin.register(BloodRequest)
class BloodRequestAdmin(admin.ModelAdmin):
    list_display = ('request_code', 'delete_action', 'patient_name', 'blood_group', 'units_needed', 'hospital_name', 'urgency', 'status', 'required_date', 'created_at')
    list_filter = ('urgency', 'status', 'blood_group')
    search_fields = ('request_code', 'patient_name', 'hospital_name', 'contact_person', 'contact_phone')
    list_editable = ('status', 'urgency')
    actions = ['mark_cancelled', 'mark_fulfilled', 'mark_urgent', 'delete_selected']

    def delete_action(self, obj):
        delete_url = reverse('admin:bloodbank_bloodrequest_delete', args=[obj.pk])
        return format_html(
            '<a class="button" style="background:#dc2626; color:#ffffff; padding:4px 12px; border-radius:6px; font-weight:700; text-decoration:none; display:inline-block; font-size:12px; white-space:nowrap;" href="{}">🗑️ Delete</a>',
            delete_url
        )
    delete_action.short_description = "Action"

    def mark_cancelled(self, request, queryset):
        count = queryset.update(status='Cancelled')
        self.message_user(request, f"{count} request(s) marked as Cancelled.")
    mark_cancelled.short_description = "Mark selected requests as Cancelled"

    def mark_fulfilled(self, request, queryset):
        count = queryset.update(status='Fulfilled')
        self.message_user(request, f"{count} request(s) marked as Fulfilled.")
    mark_fulfilled.short_description = "Mark selected requests as Fulfilled"

    def mark_urgent(self, request, queryset):
        count = queryset.update(status='Urgent Needed')
        self.message_user(request, f"{count} request(s) marked as Urgent Needed.")
    mark_urgent.short_description = "Mark selected requests as Urgent Needed"


@admin.register(DonationCamp)
class DonationCampAdmin(admin.ModelAdmin):
    list_display = ('camp_code', 'title', 'organizer', 'date', 'city', 'target_units', 'registered_count', 'status')
    list_filter = ('status', 'city')
    search_fields = ('title', 'organizer', 'venue')


@admin.register(CampRegistration)
class CampRegistrationAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'camp', 'blood_group', 'phone', 'registered_at')
    list_filter = ('blood_group', 'camp')
    search_fields = ('full_name', 'phone', 'camp__title')


@admin.register(BloodDonationRecord)
class BloodDonationRecordAdmin(admin.ModelAdmin):
    list_display = ('donor', 'units', 'blood_group', 'donation_date', 'hospital', 'camp', 'certificate_code', 'status')
    list_filter = ('blood_group', 'status', 'donation_date')
    search_fields = ('donor__full_name', 'certificate_code')
