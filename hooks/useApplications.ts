import { useMemo, useState } from "react";
import {
  ApplicationStatus,
  ApplicationType,
  RegistrationApplication,
  ApplicationReviewData,
} from "@/types/admin-applications";

const sampleApplications: RegistrationApplication[] = [
  {
    id: "APP-1001",
    applicantName: "BuildRight Ltd",
    type: "recruiter",
    submittedAt: "2026-03-06",
    status: "pending",
    recruiterDetails: {
      companyName: "BuildRight Ltd",
      contactName: "Liam Carter",
      email: "contact@buildright.co.uk",
      phone: "+44 20 1234 9988",
      addressLine1: "12 Riverbank Road",
      addressLine2: "Suite 210",
      city: "London",
      postcode: "E1 6AN",
    },
  },
  {
    id: "APP-1002",
    applicantName: "Ava Mitchell",
    type: "trade",
    submittedAt: "2026-03-05",
    status: "pending",
    tradeDetails: {
      name: "Ava Mitchell",
      occupation: "Electrician",
      address: "42 Queen Street, Birmingham",
      references: "Worked with PrimeConstruct and CityFix over the last 3 years.",
      qualificationsFileName: "ava-mitchell-level3.pdf",
      photosCount: 4,
    },
  },
  {
    id: "APP-1003",
    applicantName: "Skyline Projects",
    type: "recruiter",
    submittedAt: "2026-03-02",
    status: "approved",
    adminReason: "Company details verified and contact identity confirmed.",
    recruiterDetails: {
      companyName: "Skyline Projects",
      contactName: "Hannah Lee",
      email: "hello@skylineprojects.com",
      phone: "+44 161 555 2100",
      addressLine1: "88 Kingsway",
      addressLine2: "",
      city: "Manchester",
      postcode: "M2 4WU",
    },
  },
  {
    id: "APP-1004",
    applicantName: "Noah Brooks",
    type: "trade",
    submittedAt: "2026-03-01",
    status: "rejected",
    adminReason: "References were incomplete and qualification proof was missing.",
    tradeDetails: {
      name: "Noah Brooks",
      occupation: "Plumber",
      address: "9 Wellington Drive, Leeds",
      references: "Provided one reference only.",
      qualificationsFileName: "",
      photosCount: 1,
    },
  },
];

export const useApplications = () => {
  const [applications, setApplications] =
    useState<RegistrationApplication[]>(sampleApplications);

  const getApplicationsCount = (status: ApplicationStatus): number => {
    return applications.filter((application) => application.status === status)
      .length;
  };

  const getFilteredApplications = (
    status: ApplicationStatus
  ): RegistrationApplication[] => {
    return applications.filter((application) => application.status === status);
  };

  const getApplicationsByType = (
    type: ApplicationType
  ): RegistrationApplication[] => {
    return applications.filter((application) => application.type === type);
  };

  const getApplicationById = (
    applicationId: string
  ): RegistrationApplication | undefined => {
    return applications.find((application) => application.id === applicationId);
  };

  const reviewApplication = ({
    applicationId,
    resolution,
    reason,
  }: ApplicationReviewData): void => {
    setApplications((currentApplications) =>
      currentApplications.map((application) =>
        application.id === applicationId
          ? {
              ...application,
              status: resolution,
              adminReason: reason.trim(),
            }
          : application
      )
    );
  };

  const pendingApplications = useMemo(
    () => getFilteredApplications("pending"),
    [applications]
  );

  return {
    applications,
    pendingApplications,
    getApplicationsCount,
    getFilteredApplications,
    getApplicationsByType,
    getApplicationById,
    reviewApplication,
  };
};
