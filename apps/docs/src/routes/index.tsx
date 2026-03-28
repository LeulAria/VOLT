import { createFileRoute } from '@tanstack/react-router'
import { ArrowUpRight, Check } from 'lucide-react'
import { useState } from 'react'
import { gitConfig } from '@/lib/shared'

const INSTALL_CURL = 'curl -fsSL https://get.volt.dev/install | sh'

const RELEASES_BASE = `https://github.com/${gitConfig.user}/${gitConfig.repo}/releases/latest`
const DOWNLOAD_MAC = `${RELEASES_BASE}/download/Volt-mac.dmg`
const DOWNLOAD_WIN = `${RELEASES_BASE}/download/Volt-windows.exe`
const DOWNLOAD_LINUX = `${RELEASES_BASE}/download/Volt-linux.AppImage`

/** Windows logo — 4 panes, monochrome (inherits `currentColor`) */
function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M0 0h242.7v242.6H0zm269.3 0H512v242.6H269.3zM0 269.3h242.7V512H0zm269.3 0H512V512H269.3"
      />
    </svg>
  )
}

/** Apple logo */
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="47.6 0 416.8 512"
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M451.1 174.6c-3 2.3-55.4 31.8-55.4 97.5 0 76 66.7 102.9 68.7 103.5-.3 1.6-10.6 36.8-35.2 72.7-21.9 31.5-44.8 63-79.6 63s-43.8-20.2-84-20.2c-39.2 0-53.1 20.9-84.9 20.9s-54.1-29.2-79.6-65c-29.6-42.1-53.5-107.5-53.5-169.5 0-99.5 64.7-152.3 128.4-152.3 33.8 0 62.1 22.2 83.3 22.2 20.2 0 51.8-23.6 90.3-23.6 14.6 0 67 1.3 101.5 50.8m-119.8-93c15.9-18.9 27.2-45.1 27.2-71.3 0-3.6-.3-7.3-1-10.3-25.9 1-56.7 17.3-75.3 38.8-14.6 16.6-28.2 42.8-28.2 69.4 0 4 .7 8 1 9.3 1.6.3 4.3.7 7 .7 23.2-.1 52.4-15.6 69.3-36.6"
      />
    </svg>
  )
}

const platformOutlineBtn =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-[4px] border border-white/40 bg-transparent text-white transition-colors hover:border-white/55 hover:bg-white/5'

export const Route = createFileRoute('/')({
  component: Home
})

function Home() {
  const [copied, setCopied] = useState(false)

  async function copyInstall() {
    try {
      await navigator.clipboard.writeText(INSTALL_CURL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative min-h-screen bg-black font-sans text-white antialiased">
      <img
        src="/hero-ide.png"
        alt=""
        width={1024}
        height={656}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top-left"
        decoding="async"
        fetchPriority="high"
        sizes="100vw"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,#00000066_0%,#00000066_50%,#00000080_58%,#000000bf_72%,#000_88%,#000_100%)]"
        aria-hidden
      />

      {/* md–xl: baked-in ~90% scale so layout matches reference whether browser is at 100% or 90% zoom */}
      <div className="relative z-10 flex min-h-screen flex-col md:min-h-[111.11vh] md:[zoom:0.9]">
        <header className="mx-auto flex w-full max-w-[1200px] shrink-0 items-center justify-end gap-3 px-6 pt-6 md:px-10 lg:px-12">
          <div className="rounded-[4px] border border-white/20 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/90">
            Public beta
          </div>
          <a
            href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/35 transition-colors hover:text-white/60"
          >
            Get the GitHub
            <ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
          </a>
        </header>

        <div className="flex min-h-0 flex-1 flex-col justify-end px-6 pb-12 pt-8 md:px-10 md:pb-16 md:pt-12 lg:px-12">
          <div className="mx-auto w-full max-h-[1200px] min-h-0 max-w-[1200px] overflow-y-auto overscroll-contain">
            <h1 className="font-sans font-semibold tracking-tight">
              <span className="inline-flex shrink-0 items-center font-mono text-5xl font-bold tracking-wide md:text-7xl">
                volt
              </span>
              <div className="flex flex-col gap-2">
                <span className="mt-2 max-w-xl py-2 text-2xl md:mt-3 md:py-2.5 md:text-4xl md:leading-[1.05]">
                  The agentic development workspace.
                </span>
              </div>
            </h1>

            <div className="mt-4 w-full space-y-1.5 text-[15px] leading-snug text-white/55 md:text-base">
              <p className="block">
                Coding agents first. Workspace, editor, and Git in one surface. More intent and
                focus, less mechanics.
              </p>
            </div>

            <div className="mt-8 w-full min-w-0">
              <div className="mb-2 text-xs text-white/40">Install</div>
              <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-h-11 w-full max-w-[300px] min-w-0 shrink-0 items-center gap-2 rounded-[4px] border border-white/10 bg-black/40 py-2 pl-3 pr-2 text-[11px] text-white/75 md:text-xs">
                  <span className="shrink-0 font-mono text-emerald-400/90">&gt;_</span>
                  <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:thin]">
                    <code className="block whitespace-nowrap pr-1 font-mono">{INSTALL_CURL}</code>
                  </div>
                  <button
                    type="button"
                    onClick={copyInstall}
                    className="shrink-0 rounded-[4px] border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
                  >
                    {copied ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-400/90">
                        <Check className="size-3.5" strokeWidth={2.5} />
                        Copied
                      </span>
                    ) : (
                      'Copy'
                    )}
                  </button>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:gap-2">
                  <a
                    href={DOWNLOAD_MAC}
                    target="_blank"
                    rel="noreferrer"
                    title="Download for Mac"
                    aria-label="Download for Mac"
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[4px] bg-white px-3.5 font-sans text-sm font-semibold text-black transition-opacity hover:opacity-90"
                  >
                    <span>Download for</span>
                    <AppleIcon className="size-5 shrink-0 text-black" />
                  </a>
                  <a
                    href={DOWNLOAD_WIN}
                    target="_blank"
                    rel="noreferrer"
                    title="Download for Windows"
                    aria-label="Download for Windows"
                    className={platformOutlineBtn}
                  >
                    <WindowsIcon className="size-[22px] text-white" />
                  </a>
                  <a
                    href={DOWNLOAD_LINUX}
                    target="_blank"
                    rel="noreferrer"
                    title="Download for Linux"
                    aria-label="Download for Linux"
                    className={platformOutlineBtn}
                  >
                    <img
                      src="/linux-icon.svg"
                      alt=""
                      className="size-6 opacity-90 grayscale brightness-0 invert"
                    />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
