import { TextDecoder, TextEncoder } from 'util';

// Jest setup provided by Grafana scaffolding
import './.config/jest-setup';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// mock the intersection observer and just say everything is in view
const mockIntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn().mockImplementation((elem) => {
    callback([{ target: elem, isIntersecting: true }]);
  }),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
global.IntersectionObserver = mockIntersectionObserver;
